# 🎯 PROMPT 2: Campaign UI Restructuring - 3 Tabs & Manual Workflow Builder

## 📋 Context

This prompt continues from PROMPT 1 where we fixed the campaign completion bug and added database schema for 3 campaign types. Now we implement the UI to support:

1. **3 Campaign Tabs:** Lead Generation | Outreach | Fully Automated
2. **Manual Workflow Builder:** Create custom email sequences
3. **Batch Integration:** Connect leads management batch view to outreach campaigns
4. **Enhanced Campaign Management:** Pause/resume, better status tracking

---

## 🎯 Part 1: Campaigns Page - 3 Tabs Structure

### **Step 1.1: Update Campaigns Page Layout**

```typescript
// apps/web/src/app/campaigns/page.tsx

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Zap, Mail, Database } from 'lucide-react';
import { LeadGenerationCampaigns } from '@/components/campaigns/LeadGenerationCampaigns';
import { OutreachCampaigns } from '@/components/campaigns/OutreachCampaigns';
import { FullyAutomatedCampaigns } from '@/components/campaigns/FullyAutomatedCampaigns';

export default function CampaignsPage() {
  const [activeTab, setActiveTab] = useState<'lead-generation' | 'outreach' | 'automated'>('outreach');

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Campaigns</h1>
        <p className="text-muted-foreground">
          Manage lead generation, outreach campaigns, and fully automated workflows
        </p>
      </div>

      {/* Campaign Type Tabs */}
      <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="lead-generation" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">Lead Generation</span>
            <span className="sm:hidden">Gen</span>
          </TabsTrigger>
          <TabsTrigger value="outreach" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span className="hidden sm:inline">Outreach</span>
            <span className="sm:hidden">Out</span>
          </TabsTrigger>
          <TabsTrigger value="automated" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Fully Automated</span>
            <span className="sm:hidden">Auto</span>
          </TabsTrigger>
        </TabsList>

        {/* Lead Generation Tab */}
        <TabsContent value="lead-generation" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">Lead Generation Campaigns</h2>
              <p className="text-sm text-muted-foreground">
                Generate and save lead batches from multiple sources
              </p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Lead Generation Campaign
            </Button>
          </div>
          <LeadGenerationCampaigns />
        </TabsContent>

        {/* Outreach Tab */}
        <TabsContent value="outreach" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Outreach Campaigns</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Outreach Campaign
            </Button>
          </div>
          <OutreachCampaigns />
        </TabsContent>

        {/* Fully Automated Tab */}
        <TabsContent value="automated" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Fully Automated Campaigns</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Automated Campaign
            </Button>
          </div>
          <FullyAutomatedCampaigns />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

---

### **Step 1.2: Lead Generation Campaigns Component**

```typescript
// apps/web/src/components/campaigns/LeadGenerationCampaigns.tsx

'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Pause, 
  Calendar, 
  BarChart3, 
  Database,
  RefreshCw,
  Settings,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';

interface LeadGenerationCampaign {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
  industry: string;
  country: string;
  city: string;
  leadSources: string[];
  maxResultsPerRun: number;
  isRecurring: boolean;
  recurringInterval?: string;
  nextRunAt?: string;
  endDate?: string;
  totalLeadsGenerated: number;
  batchesCreated: number;
  createdAt: string;
  lastRunAt?: string;
}

export function LeadGenerationCampaigns() {
  const { data: campaigns, isLoading, refetch } = useQuery({
    queryKey: ['campaigns', 'lead-generation'],
    queryFn: async () => {
      const res = await fetch('/api/campaigns?type=lead_generation');
      const json = await res.json();
      return json.data as LeadGenerationCampaign[];
    }
  });

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-500',
      scheduled: 'bg-blue-500',
      running: 'bg-green-500',
      paused: 'bg-yellow-500',
      completed: 'bg-gray-400',
      failed: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const getIntervalLabel = (interval?: string) => {
    const labels = {
      daily: 'Daily',
      every_2_days: 'Every 2 Days',
      every_3_days: 'Every 3 Days',
      weekly: 'Weekly',
      monthly: 'Monthly'
    };
    return interval ? labels[interval] : 'One-time';
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading campaigns...</div>;
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Database className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Lead Generation Campaigns</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            Create your first lead generation campaign to automatically generate and save lead batches from multiple sources.
          </p>
          <Button>Create Lead Generation Campaign</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => (
        <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-lg mb-1">{campaign.name}</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getStatusColor(campaign.status)}>
                    {campaign.status}
                  </Badge>
                  {campaign.isRecurring && (
                    <Badge variant="outline" className="gap-1">
                      <RefreshCw className="h-3 w-3" />
                      {getIntervalLabel(campaign.recurringInterval)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Campaign Details */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Industry:</span>
                <span className="font-medium">{campaign.industry}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="font-medium">{campaign.city}, {campaign.country}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sources:</span>
                <span className="font-medium">{campaign.leadSources.length} sources</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Max per run:</span>
                <span className="font-medium">{campaign.maxResultsPerRun} leads</span>
              </div>
            </div>

            {/* Stats */}
            <div className="pt-3 border-t grid grid-cols-2 gap-2">
              <div className="text-center">
                <div className="text-2xl font-bold">{campaign.totalLeadsGenerated}</div>
                <div className="text-xs text-muted-foreground">Leads Generated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{campaign.batchesCreated}</div>
                <div className="text-xs text-muted-foreground">Batches Created</div>
              </div>
            </div>

            {/* Next/Last Run */}
            {campaign.isRecurring && campaign.nextRunAt && campaign.status === 'running' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded">
                <Calendar className="h-4 w-4" />
                <span>Next run: {format(new Date(campaign.nextRunAt), 'MMM d, h:mm a')}</span>
              </div>
            )}

            {campaign.lastRunAt && (
              <div className="text-xs text-muted-foreground">
                Last run: {format(new Date(campaign.lastRunAt), 'MMM d, h:mm a')}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              {campaign.status === 'running' && (
                <Button size="sm" variant="outline" className="flex-1">
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              )}
              {(campaign.status === 'paused' || campaign.status === 'draft' || campaign.status === 'scheduled') && (
                <Button size="sm" className="flex-1">
                  <Play className="h-4 w-4 mr-1" />
                  Start
                </Button>
              )}
              <Button size="sm" variant="outline">
                <Settings className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline">
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

### **Step 1.3: Outreach Campaigns Component**

```typescript
// apps/web/src/components/campaigns/OutreachCampaigns.tsx

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Mail, 
  Users, 
  BarChart3, 
  Settings,
  Eye,
  MousePointerClick,
  Reply
} from 'lucide-react';
import { format } from 'date-fns';

interface OutreachCampaign {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
  useWorkflow: boolean;
  workflowName?: string;
  templateName?: string;
  totalLeadsTargeted: number;
  emailsSentCount: number;
  emailsScheduledCount: number;
  emailsOpened: number;
  emailsClicked: number;
  emailsReplied: number;
  batchNames: string[];
  startType: 'manual' | 'scheduled';
  scheduledStartAt?: string;
  actualStartedAt?: string;
  completedAt?: string;
  currentWorkflowStep?: number;
  createdAt: string;
}

export function OutreachCampaigns() {
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns', 'outreach'],
    queryFn: async () => {
      const res = await fetch('/api/campaigns?type=outreach');
      const json = await res.json();
      return json.data as OutreachCampaign[];
    }
  });

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-500',
      scheduled: 'bg-blue-500',
      running: 'bg-green-500',
      paused: 'bg-yellow-500',
      completed: 'bg-gray-400',
      failed: 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  const calculateProgress = (campaign: OutreachCampaign) => {
    if (campaign.emailsScheduledCount === 0) return 0;
    return Math.round((campaign.emailsSentCount / campaign.emailsScheduledCount) * 100);
  };

  const calculateOpenRate = (campaign: OutreachCampaign) => {
    if (campaign.emailsSentCount === 0) return 0;
    return Math.round((campaign.emailsOpened / campaign.emailsSentCount) * 100);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading campaigns...</div>;
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Mail className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Outreach Campaigns</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            Create your first outreach campaign to send personalized emails to your leads using templates or multi-step workflows.
          </p>
          <Button>Create Outreach Campaign</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <Card key={campaign.id} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Left: Campaign Info */}
              <div className="flex-1 space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold">{campaign.name}</h3>
                    <Badge className={getStatusColor(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      {campaign.useWorkflow ? (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Workflow: {campaign.workflowName}
                          {campaign.currentWorkflowStep && (
                            <span className="ml-1">(Step {campaign.currentWorkflowStep})</span>
                          )}
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4" />
                          Template: {campaign.templateName}
                        </>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {campaign.totalLeadsTargeted} leads
                    </span>
                  </div>
                  {campaign.batchNames.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Batches: {campaign.batchNames.join(', ')}
                    </div>
                  )}
                </div>

                {/* Progress Bar */}
                {campaign.status === 'running' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {campaign.emailsSentCount} / {campaign.emailsScheduledCount} emails sent
                        ({calculateProgress(campaign)}%)
                      </span>
                    </div>
                    <Progress value={calculateProgress(campaign)} className="h-2" />
                  </div>
                )}

                {/* Timing Info */}
                <div className="text-xs text-muted-foreground">
                  {campaign.status === 'scheduled' && campaign.scheduledStartAt && (
                    <span>Scheduled for: {format(new Date(campaign.scheduledStartAt), 'MMM d, h:mm a')}</span>
                  )}
                  {campaign.actualStartedAt && (
                    <span>Started: {format(new Date(campaign.actualStartedAt), 'MMM d, h:mm a')}</span>
                  )}
                  {campaign.completedAt && (
                    <span> • Completed: {format(new Date(campaign.completedAt), 'MMM d, h:mm a')}</span>
                  )}
                </div>
              </div>

              {/* Right: Stats & Actions */}
              <div className="flex flex-col gap-4 lg:w-80">
                {/* Email Stats */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Mail className="h-3 w-3" />
                    </div>
                    <div className="text-lg font-bold">{campaign.emailsSentCount}</div>
                    <div className="text-xs text-muted-foreground">Sent</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Eye className="h-3 w-3" />
                    </div>
                    <div className="text-lg font-bold">{campaign.emailsOpened}</div>
                    <div className="text-xs text-muted-foreground">
                      {calculateOpenRate(campaign)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <MousePointerClick className="h-3 w-3" />
                    </div>
                    <div className="text-lg font-bold">{campaign.emailsClicked}</div>
                    <div className="text-xs text-muted-foreground">Clicks</div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Reply className="h-3 w-3" />
                    </div>
                    <div className="text-lg font-bold">{campaign.emailsReplied}</div>
                    <div className="text-xs text-muted-foreground">Replies</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {campaign.status === 'running' && (
                    <Button size="sm" variant="outline" className="flex-1">
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </Button>
                  )}
                  {(campaign.status === 'paused' || campaign.status === 'draft' || campaign.status === 'scheduled') && (
                    <Button size="sm" className="flex-1">
                      <Play className="h-4 w-4 mr-1" />
                      {campaign.status === 'paused' ? 'Resume' : 'Start'}
                    </Button>
                  )}
                  <Button size="sm" variant="outline">
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

### **Step 1.4: Fully Automated Campaigns Component**

```typescript
// apps/web/src/components/campaigns/FullyAutomatedCampaigns.tsx

'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Zap, Calendar, Database, Mail, BarChart3, Settings, Pause, Play } from 'lucide-react';
import { format } from 'date-fns';

interface FullyAutomatedCampaign {
  id: string;
  name: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed';
  industry: string;
  recurringInterval: string;
  leadSources: string[];
  maxResultsPerRun: number;
  outreachDelayDays: number;
  useWorkflow: boolean;
  workflowName?: string;
  templateName?: string;
  nextRunAt?: string;
  endDate?: string;
  totalRunsCompleted: number;
  totalLeadsGenerated: number;
  totalEmailsSent: number;
  createdAt: string;
}

export function FullyAutomatedCampaigns() {
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns', 'fully-automated'],
    queryFn: async () => {
      const res = await fetch('/api/campaigns?type=fully_automated');
      const json = await res.json();
      return json.data as FullyAutomatedCampaign[];
    }
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading campaigns...</div>;
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Zap className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Fully Automated Campaigns</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            Create a fully automated campaign that generates leads and sends outreach emails on a recurring schedule - completely hands-free.
          </p>
          <Button>Create Automated Campaign</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {campaigns.map((campaign) => (
        <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="pt-6 space-y-4">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold flex-1">{campaign.name}</h3>
                <Badge className={`bg-${campaign.status === 'running' ? 'green' : 'gray'}-500`}>
                  {campaign.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {campaign.industry} • {getIntervalLabel(campaign.recurringInterval)}
              </p>
            </div>

            {/* Configuration Summary */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <Database className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">Lead Generation</div>
                  <div className="text-xs text-muted-foreground">
                    {campaign.maxResultsPerRun} leads from {campaign.leadSources.length} sources
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium">Outreach</div>
                  <div className="text-xs text-muted-foreground">
                    {campaign.outreachDelayDays === 0 ? 'Immediate' : `${campaign.outreachDelayDays} days delay`}
                    <br />
                    {campaign.useWorkflow ? `Workflow: ${campaign.workflowName}` : `Template: ${campaign.templateName}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t">
              <div className="text-center">
                <div className="text-xl font-bold">{campaign.totalRunsCompleted}</div>
                <div className="text-xs text-muted-foreground">Runs</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{campaign.totalLeadsGenerated}</div>
                <div className="text-xs text-muted-foreground">Leads</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{campaign.totalEmailsSent}</div>
                <div className="text-xs text-muted-foreground">Emails</div>
              </div>
            </div>

            {/* Next Run */}
            {campaign.status === 'running' && campaign.nextRunAt && (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950 p-2 rounded text-sm">
                <Calendar className="h-4 w-4" />
                <span>Next run: {format(new Date(campaign.nextRunAt), 'MMM d, h:mm a')}</span>
              </div>
            )}

            {/* End Date */}
            {campaign.endDate && (
              <div className="text-xs text-muted-foreground">
                Ends: {format(new Date(campaign.endDate), 'MMM d, yyyy')}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              {campaign.status === 'running' && (
                <Button size="sm" variant="outline" className="flex-1">
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              )}
              {campaign.status === 'paused' && (
                <Button size="sm" className="flex-1">
                  <Play className="h-4 w-4 mr-1" />
                  Resume
                </Button>
              )}
              <Button size="sm" variant="outline">
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function getIntervalLabel(interval: string): string {
  const labels = {
    daily: 'Daily',
    every_2_days: 'Every 2 Days',
    every_3_days: 'Every 3 Days',
    weekly: 'Weekly',
    monthly: 'Monthly'
  };
  return labels[interval] || interval;
}
```

---

## 🎯 Part 2: Manual Workflow Builder

### **Step 2.1: Workflows Management Page**

```typescript
// apps/web/src/app/workflows/page.tsx

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Copy, Mail } from 'lucide-react';
import { WorkflowBuilder } from '@/components/workflows/WorkflowBuilder';

export default function WorkflowsPage() {
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(null);

  const { data: workflows, isLoading, refetch } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const res = await fetch('/api/workflows');
      const json = await res.json();
      return json.data;
    }
  });

  if (showBuilder) {
    return (
      <WorkflowBuilder
        workflowId={editingWorkflowId}
        onClose={() => {
          setShowBuilder(false);
          setEditingWorkflowId(null);
          refetch();
        }}
      />
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Email Workflows</h1>
          <p className="text-muted-foreground">
            Create multi-step email sequences with custom timing
          </p>
        </div>
        <Button onClick={() => setShowBuilder(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {isLoading && <div>Loading workflows...</div>}

      {workflows && workflows.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Workflows</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first multi-step email workflow
            </p>
            <Button onClick={() => setShowBuilder(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Workflow
            </Button>
          </CardContent>
        </Card>
      )}

      {workflows && workflows.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow: any) => (
            <Card key={workflow.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg mb-1">{workflow.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{workflow.description}</p>
                  </div>
                  <Badge variant={workflow.isActive ? 'default' : 'secondary'}>
                    {workflow.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Steps:</span>
                  <span className="font-medium">{workflow.stepsCount} emails</span>
                </div>
                {workflow.industry && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Industry:</span>
                    <span className="font-medium">{workflow.industry}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Used in:</span>
                  <span className="font-medium">{workflow.usageCount} campaigns</span>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setEditingWorkflowId(workflow.id);
                      setShowBuilder(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

### **Step 2.2: Workflow Builder Component**

```typescript
// apps/web/src/components/workflows/WorkflowBuilder.tsx

'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, ArrowRight, Mail, X, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface WorkflowStep {
  stepNumber: number;
  templateId: string;
  templateName?: string;
  daysAfterPrevious: number;
}

interface WorkflowBuilderProps {
  workflowId?: string | null;
  onClose: () => void;
}

export function WorkflowBuilder({ workflowId, onClose }: WorkflowBuilderProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { stepNumber: 1, templateId: '', daysAfterPrevious: 0 }
  ]);

  // Fetch email templates
  const { data: templates } = useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const res = await fetch('/api/email-templates');
      const json = await res.json();
      return json.data;
    }
  });

  // Fetch workflow if editing
  const { data: workflow } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: async () => {
      if (!workflowId) return null;
      const res = await fetch(`/api/workflows/${workflowId}`);
      const json = await res.json();
      return json.data;
    },
    enabled: !!workflowId
  });

  // Load workflow data when editing
  useEffect(() => {
    if (workflow) {
      setName(workflow.name);
      setDescription(workflow.description || '');
      setIndustry(workflow.industry || '');
      setSteps(workflow.steps.map((step: any) => ({
        stepNumber: step.stepNumber,
        templateId: step.templateId,
        templateName: step.template?.name,
        daysAfterPrevious: step.daysAfterPrevious
      })));
    }
  }, [workflow]);

  const addStep = () => {
    const newStepNumber = steps.length + 1;
    setSteps([...steps, {
      stepNumber: newStepNumber,
      templateId: '',
      daysAfterPrevious: 3 // Default 3 days
    }]);
  };

  const removeStep = (stepNumber: number) => {
    if (steps.length === 1) return; // Must have at least 1 step
    setSteps(steps.filter(s => s.stepNumber !== stepNumber));
    // Renumber steps
    setSteps(prevSteps => prevSteps.map((step, index) => ({
      ...step,
      stepNumber: index + 1
    })));
  };

  const updateStep = (stepNumber: number, field: string, value: any) => {
    setSteps(steps.map(step =>
      step.stepNumber === stepNumber
        ? { ...step, [field]: value }
        : step
    ));
  };

  const handleSave = async () => {
    // Validate
    if (!name.trim()) {
      alert('Please enter a workflow name');
      return;
    }

    if (steps.some(step => !step.templateId)) {
      alert('Please select a template for all steps');
      return;
    }

    // Save workflow
    const url = workflowId ? `/api/workflows/${workflowId}` : '/api/workflows';
    const method = workflowId ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        industry: industry || null,
        stepsCount: steps.length,
        steps: steps.map(step => ({
          stepNumber: step.stepNumber,
          templateId: step.templateId,
          daysAfterPrevious: step.daysAfterPrevious
        }))
      })
    });

    if (res.ok) {
      onClose();
    } else {
      const error = await res.json();
      alert(`Error: ${error.error}`);
    }
  };

  const calculateTotalDays = () => {
    return steps.reduce((total, step) => total + step.daysAfterPrevious, 0);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {workflowId ? 'Edit Workflow' : 'Create New Workflow'}
          </h1>
          <p className="text-muted-foreground">
            Build a multi-step email sequence with custom timing
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>

      <div className="space-y-6">
        {/* Basic Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Workflow Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Workflow Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Spa 5-Touch Follow-Up Sequence"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this workflow..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="industry">Industry (Optional)</Label>
              <Select value={industry} onValueChange={setIndustry}>
                <SelectTrigger id="industry">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Industry</SelectItem>
                  <SelectItem value="spa">Spa & Salon</SelectItem>
                  <SelectItem value="tour_operator">Tour Operator</SelectItem>
                  <SelectItem value="medical">Medical Clinic</SelectItem>
                  <SelectItem value="fitness">Fitness Center</SelectItem>
                  <SelectItem value="education">Education Services</SelectItem>
                  <SelectItem value="consultant">Consultants</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Workflow Steps Card */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Email Sequence ({steps.length} steps)</CardTitle>
              <Badge variant="outline">
                Total duration: {calculateTotalDays()} days
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {steps.map((step, index) => (
              <div key={step.stepNumber}>
                {index > 0 && (
                  <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                    <div className="flex-1 border-t" />
                    <ArrowRight className="h-4 w-4" />
                    <span className="font-medium">
                      {step.daysAfterPrevious} day{step.daysAfterPrevious !== 1 ? 's' : ''} later
                    </span>
                    <div className="flex-1 border-t" />
                  </div>
                )}

                <Card className="border-2">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                          {step.stepNumber}
                        </div>
                      </div>

                      <div className="flex-1 space-y-4">
                        {/* Days After Previous (skip for first step) */}
                        {step.stepNumber > 1 && (
                          <div>
                            <Label htmlFor={`days-${step.stepNumber}`}>
                              Days after previous email
                            </Label>
                            <Input
                              id={`days-${step.stepNumber}`}
                              type="number"
                              min="1"
                              max="30"
                              value={step.daysAfterPrevious}
                              onChange={(e) => updateStep(
                                step.stepNumber,
                                'daysAfterPrevious',
                                parseInt(e.target.value) || 1
                              )}
                            />
                          </div>
                        )}

                        {/* Template Selection */}
                        <div>
                          <Label htmlFor={`template-${step.stepNumber}`}>
                            Email Template *
                          </Label>
                          <Select
                            value={step.templateId}
                            onValueChange={(value) => updateStep(
                              step.stepNumber,
                              'templateId',
                              value
                            )}
                          >
                            <SelectTrigger id={`template-${step.stepNumber}`}>
                              <SelectValue placeholder="Select email template" />
                            </SelectTrigger>
                            <SelectContent>
                              {templates?.map((template: any) => (
                                <SelectItem key={template.id} value={template.id}>
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    <span>{template.name}</span>
                                    {template.category && (
                                      <Badge variant="outline" className="ml-2">
                                        {template.category}
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {step.templateId && templates && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Subject: {templates.find((t: any) => t.id === step.templateId)?.subject}
                            </p>
                          )}
                        </div>

                        {/* Preview Note */}
                        {step.stepNumber === 1 && (
                          <p className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded">
                            ℹ️ This email will be sent immediately when the campaign starts
                          </p>
                        )}
                      </div>

                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(step.stepNumber)}
                        disabled={steps.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}

            {/* Add Step Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={addStep}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Email Step
            </Button>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex gap-4">
          <Button onClick={handleSave} className="flex-1" size="lg">
            <Save className="h-4 w-4 mr-2" />
            {workflowId ? 'Update Workflow' : 'Create Workflow'}
          </Button>
          <Button variant="outline" onClick={onClose} size="lg">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
```

---

## 🎯 Part 3: Batch Integration with Outreach Campaigns

### **Step 3.1: Update Batch View - Add "Create Campaign" Button**

```typescript
// apps/web/src/app/leads/batches/[id]/page.tsx

'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react';

export default function BatchDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const handleCreateCampaign = () => {
    // Redirect to outreach campaign creation with batch pre-selected
    router.push(`/campaigns/create-outreach?batchId=${params.id}`);
  };

  return (
    <div>
      {/* ... existing batch detail UI ... */}

      {/* Add Create Campaign Button */}
      <div className="mt-6">
        <Button onClick={handleCreateCampaign} size="lg">
          <Mail className="h-4 w-4 mr-2" />
          Create Outreach Campaign for This Batch
        </Button>
      </div>
    </div>
  );
}
```

---

## ✅ Implementation Checklist

**UI Components:**
- [ ] Update `/campaigns` page with 3 tabs
- [ ] Create `LeadGenerationCampaigns` component
- [ ] Create `OutreachCampaigns` component
- [ ] Create `FullyAutomatedCampaigns` component
- [ ] Create `/workflows` page
- [ ] Create `WorkflowBuilder` component
- [ ] Update batch detail page with "Create Campaign" button

**API Routes (extend existing):**
- [ ] `GET /api/campaigns?type=lead_generation`
- [ ] `GET /api/campaigns?type=outreach`
- [ ] `GET /api/campaigns?type=fully_automated`
- [ ] `POST /api/workflows` (create)
- [ ] `PUT /api/workflows/:id` (update)
- [ ] `GET /api/workflows` (list)
- [ ] `GET /api/workflows/:id` (get)

**Testing:**
- [ ] Test 3 campaign tabs render correctly
- [ ] Test workflow builder (create & edit)
- [ ] Test batch → campaign creation flow
- [ ] Test campaign filtering by type

---

**END OF PROMPT 2**

This completes the UI implementation. Both prompts together provide a complete solution for:
1. Fixing the campaign completion bug
2. Restructuring into 3 campaign types
3. Manual workflow builder
4. Batch integration

Ready to implement!
