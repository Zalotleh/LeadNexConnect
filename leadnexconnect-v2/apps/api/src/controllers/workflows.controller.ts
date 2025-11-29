import { Request, Response } from 'express';
import { db, workflows, workflowSteps } from '@leadnex/database';
import { eq, desc } from 'drizzle-orm';
import { logger } from '../utils/logger';
import Anthropic from '@anthropic-ai/sdk';

export class WorkflowsController {
  /**
   * Get all workflows
   */
  async getWorkflows(req: Request, res: Response) {
    try {
      logger.info('[WorkflowsController] Getting workflows');

      const allWorkflows = await db
        .select()
        .from(workflows)
        .orderBy(desc(workflows.createdAt));

      // Get steps for each workflow
      const workflowsWithSteps = await Promise.all(
        allWorkflows.map(async (workflow) => {
          const steps = await db
            .select()
            .from(workflowSteps)
            .where(eq(workflowSteps.workflowId, workflow.id))
            .orderBy(workflowSteps.stepNumber);

          return {
            ...workflow,
            steps,
          };
        })
      );

      res.json({
        success: true,
        data: workflowsWithSteps,
      });
    } catch (error: any) {
      logger.error('[WorkflowsController] Error getting workflows:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch workflows',
          details: error.message,
        },
      });
    }
  }

  /**
   * Get single workflow by ID
   */
  async getWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`[WorkflowsController] Getting workflow ${id}`);

      const [workflow] = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, id))
        .limit(1);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: { message: 'Workflow not found' },
        });
      }

      // Get workflow steps
      const steps = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowId, id))
        .orderBy(workflowSteps.stepNumber);

      res.json({
        success: true,
        data: {
          ...workflow,
          steps,
        },
      });
    } catch (error: any) {
      logger.error('[WorkflowsController] Error getting workflow:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to fetch workflow',
          details: error.message,
        },
      });
    }
  }

  /**
   * Generate workflow with AI
   */
  async generateWorkflow(req: Request, res: Response) {
    try {
      const {
        name,
        description,
        stepsCount,
        daysBetween,
        industry,
        country,
        aiInstructions,
      } = req.body;

      logger.info('[WorkflowsController] Generating workflow with AI', {
        name,
        stepsCount,
      });

      // Validate
      if (!name || !stepsCount) {
        return res.status(400).json({
          success: false,
          error: { message: 'Name and stepsCount are required' },
        });
      }

      if (stepsCount < 1 || stepsCount > 10) {
        return res.status(400).json({
          success: false,
          error: { message: 'Steps count must be between 1 and 10' },
        });
      }

      // Build AI prompt
      let prompt = `Generate a ${stepsCount}-step email outreach sequence for a B2B sales campaign.

Campaign Name: ${name}
${description ? `Description: ${description}` : ''}
${industry ? `Target Industry: ${industry}` : ''}
${country ? `Target Country: ${country}` : ''}
Days Between Each Email: ${daysBetween || 3}

${aiInstructions ? `Additional Instructions: ${aiInstructions}` : ''}

For each email step, provide:
1. A compelling subject line
2. A personalized email body with placeholders for variables like {{companyName}}, {{contactName}}, {{website}}, {{industry}}

The sequence should:
- Step 1: Introduction and value proposition
- Steps 2-${stepsCount}: Progressive follow-ups building on previous emails, addressing different pain points, and creating urgency
- Use a professional but friendly tone
- Be concise (150-200 words per email)
- Include clear call-to-action in each email

Format your response as a JSON array with this structure:
[
  {
    "stepNumber": 1,
    "subject": "Subject line here",
    "body": "Email body here with {{variables}}"
  },
  ...
]`;

      // Generate with AI
      const anthropic = new Anthropic({ 
        apiKey: process.env.ANTHROPIC_API_KEY 
      });

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response format from Anthropic');
      }

      const aiResponse = content.text;
      
      // Parse AI response - handle both direct array and wrapped responses
      let emailSteps: any[];
      try {
        // Try to extract JSON array from response
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error('No JSON array found in AI response');
        }
        emailSteps = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        logger.error('[WorkflowsController] Failed to parse AI response:', parseError);
        return res.status(500).json({
          success: false,
          error: {
            message: 'Failed to parse AI-generated workflow',
            details: 'AI response was not in expected format',
          },
        });
      }

      if (!Array.isArray(emailSteps) || emailSteps.length === 0) {
        return res.status(500).json({
          success: false,
          error: { message: 'AI failed to generate valid email sequence' },
        });
      }

      // Create workflow
      const [newWorkflow] = await db
        .insert(workflows)
        .values({
          name,
          description: description || null,
          stepsCount,
          industry: industry || null,
          country: country || null,
          aiInstructions: aiInstructions || null,
          isActive: true,
          usageCount: 0,
        })
        .returning();

      logger.info(`[WorkflowsController] Created workflow ${newWorkflow.id}`);

      // Create workflow steps
      const stepValues = emailSteps.slice(0, stepsCount).map((step, index) => ({
        workflowId: newWorkflow.id,
        stepNumber: index + 1,
        daysAfterPrevious: index === 0 ? 0 : daysBetween || 3,
        subject: step.subject || `Email ${index + 1}`,
        body: step.body || '',
      }));

      const createdSteps = await db
        .insert(workflowSteps)
        .values(stepValues)
        .returning();

      logger.info(
        `[WorkflowsController] Created ${createdSteps.length} steps for workflow ${newWorkflow.id}`
      );

      res.status(201).json({
        success: true,
        data: {
          ...newWorkflow,
          steps: createdSteps,
        },
      });
    } catch (error: any) {
      logger.error('[WorkflowsController] Error generating workflow:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to generate workflow',
          details: error.message,
        },
      });
    }
  }

  /**
   * Update workflow
   */
  async updateWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, description, steps } = req.body;
      
      logger.info(`[WorkflowsController] Updating workflow ${id}`);

      // Check if workflow exists
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, id))
        .limit(1);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: { message: 'Workflow not found' },
        });
      }

      // Update workflow
      await db
        .update(workflows)
        .set({
          name: name || workflow.name,
          description: description !== undefined ? description : workflow.description,
          updatedAt: new Date(),
        })
        .where(eq(workflows.id, id));

      // Update steps if provided
      if (steps && Array.isArray(steps)) {
        for (const step of steps) {
          if (step.id) {
            await db
              .update(workflowSteps)
              .set({
                subject: step.subject,
                body: step.body,
                daysAfterPrevious: step.daysAfterPrevious,
              })
              .where(eq(workflowSteps.id, step.id));
          }
        }
      }

      // Fetch updated workflow with steps
      const [updatedWorkflow] = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, id))
        .limit(1);

      const updatedSteps = await db
        .select()
        .from(workflowSteps)
        .where(eq(workflowSteps.workflowId, id))
        .orderBy(workflowSteps.stepNumber);

      logger.info(`[WorkflowsController] Updated workflow ${id}`);

      res.json({
        success: true,
        data: {
          ...updatedWorkflow,
          steps: updatedSteps,
        },
      });
    } catch (error: any) {
      logger.error('[WorkflowsController] Error updating workflow:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update workflow',
          details: error.message,
        },
      });
    }
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(req: Request, res: Response) {
    try {
      const { id } = req.params;
      logger.info(`[WorkflowsController] Deleting workflow ${id}`);

      // Check if workflow exists
      const [workflow] = await db
        .select()
        .from(workflows)
        .where(eq(workflows.id, id))
        .limit(1);

      if (!workflow) {
        return res.status(404).json({
          success: false,
          error: { message: 'Workflow not found' },
        });
      }

      // Delete workflow (cascade will delete steps)
      await db.delete(workflows).where(eq(workflows.id, id));

      logger.info(`[WorkflowsController] Deleted workflow ${id}`);

      res.json({
        success: true,
        message: 'Workflow deleted successfully',
      });
    } catch (error: any) {
      logger.error('[WorkflowsController] Error deleting workflow:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete workflow',
          details: error.message,
        },
      });
    }
  }
}

export const workflowsController = new WorkflowsController();
