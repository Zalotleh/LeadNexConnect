import { db } from './index';
import { emailTemplates, settings, customVariables } from './schema';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Seed Email Templates
    console.log('Creating email templates...');

    await db.insert(emailTemplates).values([
      // Spa & Wellness - Initial
      {
        name: 'Spa & Wellness - Initial Outreach',
        industry: 'spa',
        followUpStage: 'initial',
        subject: 'Transform {{company_name}}\'s Booking Experience',
        bodyText: `Hi {{contact_name}},

I noticed {{company_name}} offers spa services in {{city}}. Many spas like yours struggle with:
- Double bookings and scheduling conflicts
- Missed appointments (no-shows)
- Manual WhatsApp coordination

BookNex automates all of this with:
✅ Real-time availability
✅ Automated SMS/WhatsApp reminders (reduce no-shows by 70%)
✅ Multi-location management
✅ Integrated payments (Stripe, PayPal)

Would you be open to a 15-min demo to see how we can save you 10+ hours/week?

Best regards,
Zizo
BookNex Solutions
https://booknex.com`,
        bodyHtml: `<p>Hi {{contact_name}},</p>

<p>I noticed <strong>{{company_name}}</strong> offers spa services in {{city}}. Many spas like yours struggle with:</p>
<ul>
<li>Double bookings and scheduling conflicts</li>
<li>Missed appointments (no-shows)</li>
<li>Manual WhatsApp coordination</li>
</ul>

<p><strong>BookNex</strong> automates all of this with:</p>
<ul>
<li>✅ Real-time availability</li>
<li>✅ Automated SMS/WhatsApp reminders (reduce no-shows by 70%)</li>
<li>✅ Multi-location management</li>
<li>✅ Integrated payments (Stripe, PayPal)</li>
</ul>

<p>Would you be open to a 15-min demo to see how we can save you 10+ hours/week?</p>

<p>Best regards,<br>
<strong>Zizo</strong><br>
BookNex Solutions<br>
<a href="https://booknex.com">https://booknex.com</a></p>`,
        isActive: true,
        isDefault: true,
      },

      // Spa & Wellness - Follow Up 1
      {
        name: 'Spa & Wellness - Follow Up 1',
        industry: 'spa',
        followUpStage: 'follow_up_1',
        subject: 'Quick follow-up - {{company_name}}',
        bodyText: `Hi {{contact_name}},

Following up on my previous email about BookNex.

Quick question: What's your biggest challenge with appointment scheduling right now?

I'd love to show you how we've helped spas like {{company_name}} save 10+ hours/week with automated booking and reminders.

Free 14-day trial available - no credit card needed.

Cheers,
Zizo
BookNex Solutions`,
        bodyHtml: `<p>Hi {{contact_name}},</p>

<p>Following up on my previous email about BookNex.</p>

<p><strong>Quick question:</strong> What's your biggest challenge with appointment scheduling right now?</p>

<p>I'd love to show you how we've helped spas like <strong>{{company_name}}</strong> save 10+ hours/week with automated booking and reminders.</p>

<p>Free 14-day trial available - no credit card needed.</p>

<p>Cheers,<br>
<strong>Zizo</strong><br>
BookNex Solutions</p>`,
        isActive: true,
      },

      // Spa & Wellness - Follow Up 2
      {
        name: 'Spa & Wellness - Follow Up 2',
        industry: 'spa',
        followUpStage: 'follow_up_2',
        subject: 'Last note - Free trial for {{company_name}}',
        bodyText: `Hi {{contact_name}},

Last message from me - I don't want to be a pest!

If you're still interested in automating your spa's bookings, we're offering a free 14-day trial with:
• Setup assistance
• WhatsApp integration
• No credit card required

Just reply "YES" and I'll get you started today.

If now's not the right time, no worries - feel free to reach out whenever.

Best,
Zizo
BookNex Solutions`,
        bodyHtml: `<p>Hi {{contact_name}},</p>

<p>Last message from me - I don't want to be a pest!</p>

<p>If you're still interested in automating your spa's bookings, we're offering a <strong>free 14-day trial</strong> with:</p>
<ul>
<li>Setup assistance</li>
<li>WhatsApp integration</li>
<li>No credit card required</li>
</ul>

<p>Just reply "YES" and I'll get you started today.</p>

<p>If now's not the right time, no worries - feel free to reach out whenever.</p>

<p>Best,<br>
<strong>Zizo</strong><br>
BookNex Solutions</p>`,
        isActive: true,
      },

      // Tour Operators - Initial
      {
        name: 'Tour Operators - Initial Outreach',
        industry: 'tours',
        followUpStage: 'initial',
        subject: '24/7 Booking System for {{company_name}}',
        bodyText: `Hi {{contact_name}},

I saw {{company_name}} offers tours in {{city}}. Are you still managing bookings manually through WhatsApp or email?

BookNex gives tour operators like you:
✅ 24/7 online booking (capture bookings while you sleep)
✅ Real-time availability & capacity management
✅ Automated payment collection (Stripe, PayPal)
✅ Multi-language support
✅ Google Meet/Zoom integration for virtual tours

Would you like to see a demo? We've helped tour operators increase bookings by 40%.

Best,
Zizo
BookNex Solutions`,
        bodyHtml: `<p>Hi {{contact_name}},</p>

<p>I saw <strong>{{company_name}}</strong> offers tours in {{city}}. Are you still managing bookings manually through WhatsApp or email?</p>

<p><strong>BookNex</strong> gives tour operators like you:</p>
<ul>
<li>✅ 24/7 online booking (capture bookings while you sleep)</li>
<li>✅ Real-time availability & capacity management</li>
<li>✅ Automated payment collection (Stripe, PayPal)</li>
<li>✅ Multi-language support</li>
<li>✅ Google Meet/Zoom integration for virtual tours</li>
</ul>

<p>Would you like to see a demo? We've helped tour operators increase bookings by 40%.</p>

<p>Best,<br>
<strong>Zizo</strong><br>
BookNex Solutions</p>`,
        isActive: true,
        isDefault: true,
      },

      // Clinics - Initial
      {
        name: 'Medical Clinics - Initial Outreach',
        industry: 'clinic',
        followUpStage: 'initial',
        subject: 'Modern Patient Scheduling for {{company_name}}',
        bodyText: `Hi {{contact_name}},

I noticed {{company_name}} provides medical services in {{city}}. Are you still using manual appointment booking?

BookNex offers healthcare providers:
✅ HIPAA-compliant patient scheduling
✅ Automated appointment reminders (SMS/Email)
✅ Multi-provider calendar management
✅ Patient portal for self-booking
✅ Insurance integration

Would you be interested in a quick demo? We've helped clinics reduce no-shows by 60%.

Best regards,
Zizo
BookNex Solutions`,
        bodyHtml: `<p>Hi {{contact_name}},</p>

<p>I noticed <strong>{{company_name}}</strong> provides medical services in {{city}}. Are you still using manual appointment booking?</p>

<p><strong>BookNex</strong> offers healthcare providers:</p>
<ul>
<li>✅ HIPAA-compliant patient scheduling</li>
<li>✅ Automated appointment reminders (SMS/Email)</li>
<li>✅ Multi-provider calendar management</li>
<li>✅ Patient portal for self-booking</li>
<li>✅ Insurance integration</li>
</ul>

<p>Would you be interested in a quick demo? We've helped clinics reduce no-shows by 60%.</p>

<p>Best regards,<br>
<strong>Zizo</strong><br>
BookNex Solutions</p>`,
        isActive: true,
        isDefault: true,
      },

      // Tutors - Initial
      {
        name: 'Tutors & Educators - Initial Outreach',
        industry: 'education',
        followUpStage: 'initial',
        subject: 'Automate Your Tutoring Schedule - {{company_name}}',
        bodyText: `Hi {{contact_name}},

I saw {{company_name}} offers tutoring services. Still managing student schedules manually?

BookNex helps tutors like you with:
✅ Recurring class scheduling
✅ Zoom/Google Meet integration
✅ Student attendance tracking
✅ Automated payment collection
✅ Parent communication portal

Want to see how you can save 5+ hours/week? Let's schedule a quick demo.

Best,
Zizo
BookNex Solutions`,
        bodyHtml: `<p>Hi {{contact_name}},</p>

<p>I saw <strong>{{company_name}}</strong> offers tutoring services. Still managing student schedules manually?</p>

<p><strong>BookNex</strong> helps tutors like you with:</p>
<ul>
<li>✅ Recurring class scheduling</li>
<li>✅ Zoom/Google Meet integration</li>
<li>✅ Student attendance tracking</li>
<li>✅ Automated payment collection</li>
<li>✅ Parent communication portal</li>
</ul>

<p>Want to see how you can save 5+ hours/week? Let's schedule a quick demo.</p>

<p>Best,<br>
<strong>Zizo</strong><br>
BookNex Solutions</p>`,
        isActive: true,
        isDefault: true,
      },
    ]);

    console.log('✅ Email templates created');

    // Seed Settings
    try {
      console.log('Creating default settings...');

      await db.insert(settings).values([
        {
          key: 'api_limits',
          value: {
            apollo: { limit: 100, period: 'monthly' },
            peopledatalabs: { limit: 100, period: 'monthly' },
            hunter: { limit: 50, period: 'monthly' },
            googlePlaces: { limit: 40000, period: 'monthly' },
          },
        },
        {
          key: 'email_config',
          value: {
            dailyLimit: 50,
            hourlyLimit: 20,
            followUp1DelayDays: 3,
            followUp2DelayDays: 5,
          },
        },
        {
          key: 'lead_scoring',
          value: {
            emailVerified: 40,
            websiteExists: 15,
            phoneNumber: 10,
            linkedinProfile: 15,
            companySizeMatch: 20,
          },
        },
      ]);

      console.log('✅ Default settings created');
    } catch (error: any) {
      if (error.code === '23505') {
        console.log('⚠️  Settings already exist, skipping...');
      } else {
        throw error;
      }
    }

    // Seed Custom Variables
    try {
      console.log('Creating custom variables...');

      await db.insert(customVariables).values([
      {
        key: 'company_name',
        label: 'Company Name',
        value: '{{company_name}}',
        category: 'lead',
        description: 'The name of the lead\'s company',
        defaultValue: '[Company]',
        isActive: true,
        usageCount: 0,
      },
      {
        key: 'contact_name',
        label: 'Contact Name',
        value: '{{contact_name}}',
        category: 'lead',
        description: 'The name of the lead contact person',
        defaultValue: '[Contact]',
        isActive: true,
        usageCount: 0,
      },
      {
        key: 'contact_email',
        label: 'Contact Email',
        value: '{{contact_email}}',
        category: 'lead',
        description: 'The email address of the lead contact',
        defaultValue: 'contact@example.com',
        isActive: true,
        usageCount: 0,
      },
      {
        key: 'city',
        label: 'City',
        value: '{{city}}',
        category: 'lead',
        description: 'The city where the lead\'s business is located',
        defaultValue: '[City]',
        isActive: true,
        usageCount: 0,
      },
      {
        key: 'industry',
        label: 'Industry',
        value: '{{industry}}',
        category: 'lead',
        description: 'The industry category of the lead',
        defaultValue: '[Industry]',
        isActive: true,
        usageCount: 0,
      },
      {
        key: 'sender_name',
        label: 'Sender Name',
        value: '{{sender_name}}',
        category: 'sender',
        description: 'Your name or your team member\'s name',
        defaultValue: 'Zizo',
        isActive: true,
        usageCount: 0,
      },
      {
        key: 'sender_email',
        label: 'Sender Email',
        value: '{{sender_email}}',
        category: 'sender',
        description: 'Your email address',
        defaultValue: 'hello@booknex.com',
        isActive: true,
        usageCount: 0,
      },
      {
        key: 'sender_company',
        label: 'Sender Company',
        value: '{{sender_company}}',
        category: 'sender',
        description: 'Your company name',
        defaultValue: 'BookNex Solutions',
        isActive: true,
        usageCount: 0,
      },
      {
        key: 'product_name',
        label: 'Product Name',
        value: '{{product_name}}',
        category: 'product',
        description: 'The name of your product or service',
        defaultValue: 'BookNex',
        isActive: true,
        usageCount: 0,
      },
      {
        key: 'product_url',
        label: 'Product URL',
        value: '{{product_url}}',
        category: 'product',
        description: 'Your product or company website URL',
        defaultValue: 'https://booknex.com',
        isActive: true,
        usageCount: 0,
      },
      {
        key: 'unsubscribe_link',
        label: 'Unsubscribe Link',
        value: '{{unsubscribe_link}}',
        category: 'system',
        description: 'Link to unsubscribe from emails',
        defaultValue: '[Unsubscribe URL]',
        isActive: true,
        usageCount: 0,
      },
      {
        key: 'current_date',
        label: 'Current Date',
        value: '{{current_date}}',
        category: 'system',
        description: 'The current date when the email is sent',
        defaultValue: new Date().toISOString().split('T')[0],
        isActive: true,
        usageCount: 0,
      },
    ]);

    console.log('✅ Default custom variables created');
    } catch (error: any) {
      if (error.code === '23505') {
        console.log('⚠️  Custom variables already exist, skipping...');
      } else {
        throw error;
      }
    }

    console.log('🎉 Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
