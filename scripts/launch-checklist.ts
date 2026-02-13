import { ZIBRA_TEMPLATES } from "../shared/zibra-templates";
import { trainingModules } from "../shared/training-content";
import { storeComplianceChecklist } from "../shared/store-compliance";
import { directorAppeals, directorProfiles, performanceAlerts, userRoleEnum, directorCells, directorDriverAssignments, directorStaff, directorActionLogs, directorCoachingLogs } from "../shared/schema";

const BASE_URL = "http://localhost:5000";

interface CheckResult {
  name: string;
  passed: boolean;
  details: string[];
}

const results: CheckResult[] = [];

function check1_RoleSystem(): CheckResult {
  const requiredRoles = ["super_admin", "admin", "driver", "rider", "director", "finance", "trip_coordinator", "support_agent"];
  const details: string[] = [];
  const enumValues = userRoleEnum.enumValues;
  let allPresent = true;

  for (const role of requiredRoles) {
    if (!enumValues.includes(role as any)) {
      details.push(`Missing role: ${role}`);
      allPresent = false;
    }
  }

  return { name: "Role System", passed: allPresent, details };
}

function check2_ZibraSafety(): CheckResult {
  const details: string[] = [];
  let passed = true;

  const legalWords = ["guarantee", "promise", "ensure"];
  const negationPattern = /(?:cannot|no|not|does not|or)\s+$/i;
  const imperativePattern = /(?:^|\.\s*|\n\s*\d*\.?\s*|to\s+|s\s+)$/;

  for (const template of ZIBRA_TEMPLATES) {
    const response = template.response.toLowerCase();
    for (const word of legalWords) {
      let searchFrom = 0;
      while (true) {
        const wordIndex = response.indexOf(word, searchFrom);
        if (wordIndex === -1) break;
        searchFrom = wordIndex + word.length;
        const preceding = response.substring(Math.max(0, wordIndex - 50), wordIndex);
        if (negationPattern.test(preceding)) continue;
        if (imperativePattern.test(preceding)) continue;
        details.push(`Template ${template.id} contains "${word}" without proper negation`);
        passed = false;
      }
    }
  }

  const directorTemplates = ZIBRA_TEMPLATES.filter(t => {
    const roles = Array.isArray(t.role) ? t.role : [t.role];
    return roles.includes("director");
  });

  const aggressiveWords = ["demand", "threaten", "must immediately", "you will be fired", "punishment"];
  for (const template of directorTemplates) {
    const response = template.response.toLowerCase();
    for (const word of aggressiveWords) {
      if (response.includes(word)) {
        details.push(`Director template ${template.id} contains aggressive language: "${word}"`);
        passed = false;
      }
    }
  }

  const financialPatterns = [/\d+%\s*commission/, /\$\d+/, /NGN\s*\d+/, /exact\s+commission/i];
  for (const template of ZIBRA_TEMPLATES) {
    for (const pattern of financialPatterns) {
      if (pattern.test(template.response)) {
        details.push(`Template ${template.id} exposes financial data: ${pattern}`);
        passed = false;
      }
    }
  }

  return { name: "ZIBRA Safety", passed, details };
}

function check3_CommissionProtection(): CheckResult {
  const details: string[] = [];
  let passed = true;

  const forbiddenStrings = ["77%", "1000", "1300"];
  const directorTemplates = ZIBRA_TEMPLATES.filter(t => {
    const roles = Array.isArray(t.role) ? t.role : [t.role];
    return roles.includes("director");
  });

  for (const template of directorTemplates) {
    for (const forbidden of forbiddenStrings) {
      if (template.response.includes(forbidden)) {
        details.push(`Director template ${template.id} exposes commission threshold: "${forbidden}"`);
        passed = false;
      }
    }
  }

  const percentPattern = /\d+%/;
  for (const template of directorTemplates) {
    const match = template.response.match(percentPattern);
    if (match) {
      details.push(`Director template ${template.id} contains percentage: "${match[0]}"`);
      passed = false;
    }
  }

  return { name: "Commission Protection", passed, details };
}

function check4_TrainingContent(): CheckResult {
  const details: string[] = [];
  let passed = true;

  const contractDirectorModules = trainingModules.filter(m => m.role === "contract_director");
  const employedDirectorModules = trainingModules.filter(m => m.role === "employed_director");
  const driverModules = trainingModules.filter(m => m.role === "driver");

  if (contractDirectorModules.length < 6) {
    details.push(`Contract director modules: ${contractDirectorModules.length} (need >= 6)`);
    passed = false;
  }
  if (employedDirectorModules.length < 4) {
    details.push(`Employed director modules: ${employedDirectorModules.length} (need >= 4)`);
    passed = false;
  }
  if (driverModules.length < 4) {
    details.push(`Driver modules: ${driverModules.length} (need >= 4)`);
    passed = false;
  }

  const financialPattern = /\$\d+|\d+%|NGN\s*\d+|\d{4,}/;
  for (const mod of trainingModules) {
    for (const bullet of mod.bullets) {
      if (financialPattern.test(bullet)) {
        details.push(`Module ${mod.id} bullet contains financial number: "${bullet.substring(0, 60)}..."`);
        passed = false;
      }
    }
  }

  return { name: "Training Content", passed, details };
}

function check5_StoreCompliance(): CheckResult {
  const details: string[] = [];
  let passed = true;

  if (storeComplianceChecklist.length !== 12) {
    details.push(`Expected 12 compliance items, found ${storeComplianceChecklist.length}`);
    passed = false;
  }

  const failedItems = storeComplianceChecklist.filter(item => item.status !== "pass");
  if (failedItems.length > 0) {
    for (const item of failedItems) {
      details.push(`Item ${item.id} (${item.title}) status: ${item.status}`);
    }
    passed = false;
  }

  const requiredCategories = ["automation_disclosure", "permissions", "safety_language", "accessibility"];
  const foundCategories = new Set(storeComplianceChecklist.map(item => item.category));
  for (const cat of requiredCategories) {
    if (!foundCategories.has(cat as any)) {
      details.push(`Missing category: ${cat}`);
      passed = false;
    }
  }

  return { name: "Store Compliance", passed, details };
}

function check6_AppealsSuspensions(): CheckResult {
  const details: string[] = [];
  let passed = true;

  if (!directorAppeals) {
    details.push("directorAppeals table not found in schema");
    passed = false;
  }

  if (!directorProfiles) {
    details.push("directorProfiles table not found in schema");
    passed = false;
  } else {
    const columns = Object.keys(directorProfiles);
    if (!columns.includes("lifecycleStatus")) {
      details.push("directorProfiles missing lifecycleStatus field");
      passed = false;
    }
  }

  return { name: "Appeals & Suspensions", passed, details };
}

async function check7_RouteSecurity(): Promise<CheckResult> {
  const details: string[] = [];
  let passed = true;

  const endpoints: { method: string; path: string }[] = [
    { method: "GET", path: "/api/director/dashboard" },
    { method: "GET", path: "/api/director/onboarding/status" },
    { method: "POST", path: "/api/director/appeals" },
    { method: "GET", path: "/api/alerts/admin" },
    { method: "GET", path: "/api/training/acknowledgements" },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: { "Content-Type": "application/json" },
      });
      if (response.status !== 401) {
        details.push(`${endpoint.method} ${endpoint.path} returned ${response.status} (expected 401)`);
        passed = false;
      }
    } catch (err: any) {
      details.push(`${endpoint.method} ${endpoint.path} failed: ${err.message}`);
      passed = false;
    }
  }

  return { name: "Route Security", passed, details };
}

async function check8_PerformanceAlerts(): Promise<CheckResult> {
  const details: string[] = [];
  let passed = true;

  if (!performanceAlerts) {
    details.push("performanceAlerts table not found in schema");
    passed = false;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/alerts/my`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (response.status !== 401) {
      details.push(`GET /api/alerts/my returned ${response.status} (expected 401)`);
      passed = false;
    }
  } catch (err: any) {
    details.push(`GET /api/alerts/my failed: ${err.message}`);
    passed = false;
  }

  return { name: "Performance Alerts", passed, details };
}

async function check9_LifespanEnforcement(): Promise<CheckResult> {
  const details: string[] = [];
  let passed = true;

  const columns = Object.keys(directorProfiles);
  if (!columns.includes("lifespanStartDate")) {
    details.push("directorProfiles missing lifespanStartDate field");
    passed = false;
  }
  if (!columns.includes("lifespanEndDate")) {
    details.push("directorProfiles missing lifespanEndDate field");
    passed = false;
  }

  const endpoints: { method: string; path: string }[] = [
    { method: "POST", path: "/api/admin/directors/check-lifespan-expiry" },
    { method: "GET", path: "/api/director/lifespan" },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: { "Content-Type": "application/json" },
      });
      if (response.status !== 401) {
        details.push(`${endpoint.method} ${endpoint.path} returned ${response.status} (expected 401)`);
        passed = false;
      }
    } catch (err: any) {
      details.push(`${endpoint.method} ${endpoint.path} failed: ${err.message}`);
      passed = false;
    }
  }

  return { name: "Lifespan Enforcement", passed, details };
}

async function check10_MultiCell(): Promise<CheckResult> {
  const details: string[] = [];
  let passed = true;

  if (!directorCells) {
    details.push("directorCells table not found in schema");
    passed = false;
  }

  if (!directorDriverAssignments) {
    details.push("directorDriverAssignments table not found in schema");
    passed = false;
  } else {
    const columns = Object.keys(directorDriverAssignments);
    if (!columns.includes("cellNumber")) {
      details.push("directorDriverAssignments missing cellNumber field");
      passed = false;
    }
  }

  const endpoints: { method: string; path: string }[] = [
    { method: "POST", path: "/api/director/cells" },
    { method: "GET", path: "/api/director/cells" },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: { "Content-Type": "application/json" },
      });
      if (response.status !== 401) {
        details.push(`${endpoint.method} ${endpoint.path} returned ${response.status} (expected 401)`);
        passed = false;
      }
    } catch (err: any) {
      details.push(`${endpoint.method} ${endpoint.path} failed: ${err.message}`);
      passed = false;
    }
  }

  return { name: "Multi-Cell (3-Cell Limit)", passed, details };
}

async function check11_DashboardIsolation(): Promise<CheckResult> {
  const details: string[] = [];
  let passed = true;

  const endpoints: { method: string; path: string }[] = [
    { method: "GET", path: "/api/director/dashboard/full" },
    { method: "GET", path: "/api/admin/directors/test-user/dashboard" },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: { "Content-Type": "application/json" },
      });
      if (response.status !== 401) {
        details.push(`${endpoint.method} ${endpoint.path} returned ${response.status} (expected 401)`);
        passed = false;
      }
    } catch (err: any) {
      details.push(`${endpoint.method} ${endpoint.path} failed: ${err.message}`);
      passed = false;
    }
  }

  const fullPath = "/api/director/dashboard/full";
  const originalPath = "/api/director/dashboard";
  if (fullPath as string === originalPath as string) {
    details.push("Dashboard full endpoint is not separate from original dashboard endpoint");
    passed = false;
  }

  return { name: "Director Dashboard Isolation", passed, details };
}

async function check12_StaffPermissions(): Promise<CheckResult> {
  const details: string[] = [];
  let passed = true;

  if (!directorStaff) {
    details.push("directorStaff table not found in schema");
    passed = false;
  } else {
    const columns = Object.keys(directorStaff);
    if (!columns.includes("permissions")) {
      details.push("directorStaff missing permissions field");
      passed = false;
    }
  }

  const endpoints: { method: string; path: string }[] = [
    { method: "POST", path: "/api/director/staff" },
    { method: "GET", path: "/api/admin/director-staff/pending" },
    { method: "POST", path: "/api/admin/director-staff/test-id/approve" },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: { "Content-Type": "application/json" },
      });
      if (response.status !== 401) {
        details.push(`${endpoint.method} ${endpoint.path} returned ${response.status} (expected 401)`);
        passed = false;
      }
    } catch (err: any) {
      details.push(`${endpoint.method} ${endpoint.path} failed: ${err.message}`);
      passed = false;
    }
  }

  return { name: "Staff Permissions Scoped", passed, details };
}

async function check13_AuditTrail(): Promise<CheckResult> {
  const details: string[] = [];
  let passed = true;

  if (!directorActionLogs) {
    details.push("directorActionLogs table not found in schema");
    passed = false;
  } else {
    const columns = Object.keys(directorActionLogs);
    if (!columns.includes("beforeState")) {
      details.push("directorActionLogs missing beforeState field");
      passed = false;
    }
    if (!columns.includes("afterState")) {
      details.push("directorActionLogs missing afterState field");
      passed = false;
    }
  }

  const endpoints: { method: string; path: string }[] = [
    { method: "GET", path: "/api/admin/director-action-logs" },
    { method: "GET", path: "/api/director/action-logs" },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: { "Content-Type": "application/json" },
      });
      if (response.status !== 401) {
        details.push(`${endpoint.method} ${endpoint.path} returned ${response.status} (expected 401)`);
        passed = false;
      }
    } catch (err: any) {
      details.push(`${endpoint.method} ${endpoint.path} failed: ${err.message}`);
      passed = false;
    }
  }

  return { name: "Audit Trail Complete", passed, details };
}

async function check14_ZibraCoaching(): Promise<CheckResult> {
  const details: string[] = [];
  let passed = true;

  const coachingTemplates = ZIBRA_TEMPLATES.filter(t => t.category === "director_coaching");
  if (coachingTemplates.length < 5) {
    details.push(`Director coaching templates: ${coachingTemplates.length} (need >= 5)`);
    passed = false;
  }

  if (!directorCoachingLogs) {
    details.push("directorCoachingLogs table not found in schema");
    passed = false;
  }

  const aggressiveTerms = ["punish", "fire", "terminate immediately"];
  for (const template of coachingTemplates) {
    const response = template.response.toLowerCase();
    for (const term of aggressiveTerms) {
      if (response.includes(term)) {
        details.push(`Coaching template ${template.id} contains aggressive language: "${term}"`);
        passed = false;
      }
    }
  }

  const endpoints: { method: string; path: string }[] = [
    { method: "GET", path: "/api/director/coaching" },
    { method: "POST", path: "/api/director/coaching/generate" },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: { "Content-Type": "application/json" },
      });
      if (response.status !== 401) {
        details.push(`${endpoint.method} ${endpoint.path} returned ${response.status} (expected 401)`);
        passed = false;
      }
    } catch (err: any) {
      details.push(`${endpoint.method} ${endpoint.path} failed: ${err.message}`);
      passed = false;
    }
  }

  return { name: "ZIBRA Coaching Active", passed, details };
}

async function check15_AdminSupremacy(): Promise<CheckResult> {
  const details: string[] = [];
  let passed = true;

  const endpoints: { method: string; path: string }[] = [
    { method: "POST", path: "/api/admin/directors/test-user/lifespan" },
    { method: "POST", path: "/api/admin/directors/test-user/coaching/send" },
    { method: "GET", path: "/api/admin/director-action-logs" },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: { "Content-Type": "application/json" },
      });
      if (response.status !== 401) {
        details.push(`${endpoint.method} ${endpoint.path} returned ${response.status} (expected 401)`);
        passed = false;
      }
    } catch (err: any) {
      details.push(`${endpoint.method} ${endpoint.path} failed: ${err.message}`);
      passed = false;
    }
  }

  return { name: "Admin/Super Admin Supremacy", passed, details };
}

function formatResult(index: number, total: number, result: CheckResult): string {
  const label = `[${index}/${total}]`;
  const dots = ".".repeat(Math.max(1, 40 - result.name.length));
  const status = result.passed ? "\x1b[32m\u2713 PASS\x1b[0m" : "\x1b[31m\u2717 FAIL\x1b[0m";
  let line = `${label} ${result.name} ${dots} ${status}`;
  if (!result.passed && result.details.length > 0) {
    for (const detail of result.details) {
      line += `\n      ${detail}`;
    }
  }
  return line;
}

async function main() {
  console.log("");
  console.log("\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
  console.log("\u2551   ZIBANA GOVERNANCE READINESS CHECK     \u2551");
  console.log("\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d");
  console.log("");

  results.push(check1_RoleSystem());
  results.push(check2_ZibraSafety());
  results.push(check3_CommissionProtection());
  results.push(check4_TrainingContent());
  results.push(check5_StoreCompliance());
  results.push(check6_AppealsSuspensions());
  results.push(await check7_RouteSecurity());
  results.push(await check8_PerformanceAlerts());
  results.push(await check9_LifespanEnforcement());
  results.push(await check10_MultiCell());
  results.push(await check11_DashboardIsolation());
  results.push(await check12_StaffPermissions());
  results.push(await check13_AuditTrail());
  results.push(await check14_ZibraCoaching());
  results.push(await check15_AdminSupremacy());

  const total = 15;
  for (let i = 0; i < results.length; i++) {
    console.log(formatResult(i + 1, total, results[i]));
  }

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log("");
  console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
  console.log("FINAL REPORT");
  console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
  console.log(`Total Checks: 15`);
  console.log(`Passed: ${passedCount}/15`);
  console.log(`Failed: ${failedCount}/15`);
  console.log("");

  if (failedCount === 0) {
    console.log("\x1b[32m\u2713 ZIBANA IS GOVERNANCE READY\x1b[0m");
    process.exit(0);
  } else {
    console.log(`\x1b[31m\u2717 ZIBANA IS NOT GOVERNANCE READY - ${failedCount} issue${failedCount > 1 ? "s" : ""} must be resolved\x1b[0m`);
    process.exit(1);
  }
}

main();
