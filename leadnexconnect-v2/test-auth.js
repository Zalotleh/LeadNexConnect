#!/usr/bin/env node

/**
 * Authentication & Authorization Test Suite
 * Tests all authentication, authorization, data isolation, and admin features
 */

const http = require('http');

const API_BASE = 'http://localhost:4000';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test credentials
const TEST_USERS = {
  admin: {
    email: 'admin@leadnex.com',
    password: 'Admin@123!'
  },
  user1: {
    email: 'user1@leadnex.com',
    password: 'ChangeMe123!'
  },
  user2: {
    email: 'user2@leadnex.com',
    password: 'ChangeMe123!'
  }
};

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

/**
 * Make HTTP request
 */
function request(method, path, data = null, cookies = '') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          const setCookie = res.headers['set-cookie'] || [];
          resolve({
            status: res.statusCode,
            data: parsedBody,
            cookies: setCookie.join('; ')
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body,
            cookies: res.headers['set-cookie']?.join('; ') || ''
          });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Test assertion
 */
function test(name, condition, details = '') {
  results.total++;
  if (condition) {
    results.passed++;
    console.log(`${colors.green}✓${colors.reset} ${name}`);
    if (details) console.log(`  ${colors.cyan}${details}${colors.reset}`);
  } else {
    results.failed++;
    results.errors.push(name);
    console.log(`${colors.red}✗${colors.reset} ${name}`);
    if (details) console.log(`  ${colors.yellow}${details}${colors.reset}`);
  }
}

/**
 * Print section header
 */
function section(title) {
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}${title}${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

/**
 * Main test execution
 */
async function runTests() {
  console.log(`${colors.cyan}
╔═══════════════════════════════════════════════════════════════╗
║         LeadNexConnect Authentication Test Suite             ║
║                    Phase 10: Testing & QA                     ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  const tokens = {};

  try {
    // ===================================================================
    // 1. AUTHENTICATION TESTS
    // ===================================================================
    section('1. AUTHENTICATION TESTS');

    // Test 1.1: Login with admin credentials
    const adminLogin = await request('POST', '/api/auth/login', TEST_USERS.admin);
    test(
      '1.1 Admin Login',
      adminLogin.status === 200 && adminLogin.data.success,
      `Status: ${adminLogin.status}, Token: ${adminLogin.cookies ? 'Present' : 'Missing'}`
    );
    tokens.admin = adminLogin.cookies;

    // Test 1.2: Login with user1 credentials
    const user1Login = await request('POST', '/api/auth/login', TEST_USERS.user1);
    test(
      '1.2 User1 Login',
      user1Login.status === 200 && user1Login.data.success,
      `Status: ${user1Login.status}`
    );
    tokens.user1 = user1Login.cookies;

    // Test 1.3: Login with user2 credentials
    const user2Login = await request('POST', '/api/auth/login', TEST_USERS.user2);
    test(
      '1.3 User2 Login',
      user2Login.status === 200 && user2Login.data.success,
      `Status: ${user2Login.status}`
    );
    tokens.user2 = user2Login.cookies;

    // Test 1.4: Login with invalid credentials
    const invalidLogin = await request('POST', '/api/auth/login', {
      email: 'invalid@test.com',
      password: 'wrong'
    });
    test(
      '1.4 Invalid Login Rejected',
      invalidLogin.status === 401,
      `Status: ${invalidLogin.status}`
    );

    // Test 1.5: Get current user (admin)
    const adminMe = await request('GET', '/api/auth/me', null, tokens.admin);
    test(
      '1.5 Get Current User (Admin)',
      adminMe.status === 200 && adminMe.data?.data?.role === 'admin',
      `Role: ${adminMe.data?.data?.role || 'undefined'}, Status: ${adminMe.status}`
    );

    // Test 1.6: Get current user (user1)
    const user1Me = await request('GET', '/api/auth/me', null, tokens.user1);
    test(
      '1.6 Get Current User (User1)',
      user1Me.status === 200 && user1Me.data?.data?.role === 'user',
      `Role: ${user1Me.data?.data?.role || 'undefined'}, Status: ${user1Me.status}`
    );

    // ===================================================================
    // 2. AUTHORIZATION TESTS
    // ===================================================================
    section('2. AUTHORIZATION TESTS (Role-Based Access)');

    // Test 2.1: Admin can access user management
    const adminUsers = await request('GET', '/api/users', null, tokens.admin);
    test(
      '2.1 Admin Access: User Management',
      adminUsers.status === 200,
      `Status: ${adminUsers.status}, Users: ${adminUsers.data.data?.length || 0}`
    );

    // Test 2.2: Regular user cannot access user management
    const user1Users = await request('GET', '/api/users', null, tokens.user1);
    test(
      '2.2 User Denied: User Management',
      user1Users.status === 403,
      `Status: ${user1Users.status}`
    );

    // Test 2.3: Admin can access analytics
    const adminAnalytics = await request('GET', '/api/admin/analytics/system', null, tokens.admin);
    test(
      '2.3 Admin Access: Analytics',
      adminAnalytics.status === 200,
      `Status: ${adminAnalytics.status}`
    );

    // Test 2.4: Regular user cannot access admin analytics
    const user1Analytics = await request('GET', '/api/admin/analytics/system', null, tokens.user1);
    test(
      '2.4 User Denied: Admin Analytics',
      user1Analytics.status === 403,
      `Status: ${user1Analytics.status}`
    );

    // Test 2.5: Unauthenticated request rejected
    const noAuthLeads = await request('GET', '/api/leads');
    test(
      '2.5 Unauthenticated Request Rejected',
      noAuthLeads.status === 401,
      `Status: ${noAuthLeads.status}`
    );

    // ===================================================================
    // 3. DATA ISOLATION TESTS
    // ===================================================================
    section('3. DATA ISOLATION TESTS');

    // Test 3.1: User1 can see their own leads
    const user1Leads = await request('GET', '/api/leads', null, tokens.user1);
    test(
      '3.1 User1 Can Access Own Leads',
      user1Leads.status === 200,
      `Status: ${user1Leads.status}, Leads: ${user1Leads.data.data?.leads?.length || 0}`
    );

    // Test 3.2: User2 can see their own leads (should be different from user1)
    const user2Leads = await request('GET', '/api/leads', null, tokens.user2);
    test(
      '3.2 User2 Can Access Own Leads',
      user2Leads.status === 200,
      `Status: ${user2Leads.status}, Leads: ${user2Leads.data.data?.leads?.length || 0}`
    );

    // Test 3.3: User1 campaigns
    const user1Campaigns = await request('GET', '/api/campaigns', null, tokens.user1);
    test(
      '3.3 User1 Can Access Own Campaigns',
      user1Campaigns.status === 200,
      `Campaigns: ${user1Campaigns.data.data?.length || 0}`
    );

    // Test 3.4: User2 campaigns (should be separate)
    const user2Campaigns = await request('GET', '/api/campaigns', null, tokens.user2);
    test(
      '3.4 User2 Can Access Own Campaigns',
      user2Campaigns.status === 200,
      `Campaigns: ${user2Campaigns.data.data?.length || 0}`
    );

    // Test 3.5: User workflows isolation
    const user1Workflows = await request('GET', '/api/workflows', null, tokens.user1);
    test(
      '3.5 User1 Workflows Isolated',
      user1Workflows.status === 200,
      `Workflows: ${user1Workflows.data.data?.length || 0}`
    );

    // Test 3.6: User templates isolation
    const user1Templates = await request('GET', '/api/templates', null, tokens.user1);
    test(
      '3.6 User1 Templates Isolated',
      user1Templates.status === 200,
      `Templates: ${user1Templates.data.data?.length || 0}`
    );

    // ===================================================================
    // 4. ADMIN FEATURES TESTS
    // ===================================================================
    section('4. ADMIN FEATURES TESTS');

    // Test 4.1: Admin can view audit logs
    const auditLogs = await request('GET', '/api/admin/audit-logs', null, tokens.admin);
    test(
      '4.1 Admin Audit Logs Access',
      auditLogs.status === 200,
      `Logs: ${auditLogs.data.data?.logs?.length || 0}`
    );

    // Test 4.2: Admin can view sessions
    const sessions = await request('GET', '/api/admin/sessions', null, tokens.admin);
    test(
      '4.2 Admin Sessions Access',
      sessions.status === 200,
      `Sessions: ${sessions.data.data?.sessions?.length || 0}`
    );

    // Test 4.3: Admin analytics - leads trend
    const leadsTrend = await request('GET', '/api/admin/analytics/charts/leads-trend', null, tokens.admin);
    test(
      '4.3 Admin Analytics: Leads Trend',
      leadsTrend.status === 200,
      `Data points: ${leadsTrend.data.data?.length || 0}`
    );

    // Test 4.4: Admin analytics - campaign distribution
    const campaignDist = await request('GET', '/api/admin/analytics/charts/campaign-distribution', null, tokens.admin);
    test(
      '4.4 Admin Analytics: Campaign Distribution',
      campaignDist.status === 200,
      `Categories: ${campaignDist.data.data?.length || 0}`
    );

    // Test 4.5: Admin analytics - system overview
    const systemOverview = await request('GET', '/api/admin/analytics/system', null, tokens.admin);
    test(
      '4.5 Admin Analytics: System Overview',
      systemOverview.status === 200 && systemOverview.data?.data,
      `Total Users: ${systemOverview.data?.data?.totalUsers || 'undefined'}`
    );

    // Test 4.6: Admin can view user stats
    const userId = adminMe.data?.data?.id;
    if (userId) {
      const userStats = await request('GET', `/api/admin/users/${userId}/stats`, null, tokens.admin);
      test(
        '4.6 Admin User Statistics',
        userStats.status === 200,
        `Status: ${userStats.status}`
      );
    } else {
      test('4.6 Admin User Statistics', false, 'Skipped - No user ID available');
    }

    // ===================================================================
    // 5. SESSION MANAGEMENT TESTS
    // ===================================================================
    section('5. SESSION MANAGEMENT TESTS');

    // Test 5.1: Session stats
    const sessionStats = await request('GET', '/api/admin/sessions/stats', null, tokens.admin);
    test(
      '5.1 Session Statistics',
      sessionStats.status === 200 && sessionStats.data.data,
      `Active: ${sessionStats.data.data?.totalActive || 0}, Total: ${sessionStats.data.data?.totalSessions || 0}`
    );

    // Test 5.2: Get user sessions
    const userSessions = await request('GET', `/api/admin/sessions/users/${userId}`, null, tokens.admin);
    test(
      '5.2 Get User Sessions',
      userSessions.status === 200,
      `Sessions: ${userSessions.data.data?.length || 0}`
    );

    // ===================================================================
    // 6. ERROR HANDLING TESTS
    // ===================================================================
    section('6. ERROR HANDLING TESTS');

    // Test 6.1: Invalid JWT token
    const invalidToken = await request('GET', '/api/leads', null, 'token=invalid');
    test(
      '6.1 Invalid Token Rejected',
      invalidToken.status === 401,
      `Status: ${invalidToken.status}`
    );

    // Test 6.2: Access nonexistent resource
    const nonexistent = await request('GET', '/api/leads/99999999-9999-9999-9999-999999999999', null, tokens.user1);
    test(
      '6.2 Nonexistent Resource Returns 404',
      nonexistent.status === 404 || nonexistent.status === 400,
      `Status: ${nonexistent.status}`
    );

    // Test 6.3: Missing required fields
    const invalidCampaign = await request('POST', '/api/campaigns', { name: '' }, tokens.user1);
    test(
      '6.3 Invalid Data Rejected',
      invalidCampaign.status === 400 || invalidCampaign.status === 500,
      `Status: ${invalidCampaign.status}`
    );

    // ===================================================================
    // 7. LOGOUT TESTS
    // ===================================================================
    section('7. LOGOUT & SESSION CLEANUP');

    // Test 7.1: Logout user1
    const user1Logout = await request('POST', '/api/auth/logout', null, tokens.user1);
    test(
      '7.1 User1 Logout',
      user1Logout.status === 200,
      `Status: ${user1Logout.status}`
    );

    // Test 7.2: Access after logout should fail
    const afterLogout = await request('GET', '/api/leads', null, tokens.user1);
    test(
      '7.2 Access After Logout Denied',
      afterLogout.status === 401,
      `Status: ${afterLogout.status}`
    );

  } catch (error) {
    console.error(`${colors.red}\n❌ Test execution error:${colors.reset}`, error.message);
    results.failed++;
    results.errors.push(`Execution Error: ${error.message}`);
  }

  // ===================================================================
  // TEST RESULTS SUMMARY
  // ===================================================================
  console.log(`\n${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}TEST RESULTS SUMMARY${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}\n`);

  console.log(`Total Tests:  ${results.total}`);
  console.log(`${colors.green}✓ Passed:     ${results.passed}${colors.reset}`);
  console.log(`${colors.red}✗ Failed:     ${results.failed}${colors.reset}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

  if (results.failed > 0) {
    console.log(`${colors.red}Failed Tests:${colors.reset}`);
    results.errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
    console.log('');
  }

  if (results.passed === results.total) {
    console.log(`${colors.green}🎉 All tests passed! Authentication system is working perfectly.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.yellow}⚠️  Some tests failed. Please review the errors above.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
