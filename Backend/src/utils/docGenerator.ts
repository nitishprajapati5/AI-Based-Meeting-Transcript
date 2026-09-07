import fs from "fs";
import path from "path";
import { serviceRegistry } from "../services/serviceRegistry";

const sampleBodies: Record<string, { payload?: any; params?: any; query?: any }> = {
  "auth.register": {
    payload: { name: "John Doe", email: "john@example.com", password: "password123" },
  },
  "auth.login": {
    payload: { email: "john@example.com", password: "password123" },
  },
  "auth.changePassword": {
    payload: { oldPassword: "password123", newPassword: "newpassword123" },
  },
  "meetings.list": {
    query: { page: 1, limit: 10, sortBy: "date", sortOrder: "desc" },
  },
  "meetings.get": {
    params: { id: "65b9c1f2d3a4e5b6c7d8e9f0" },
  },
  "meetings.create": {
    payload: { title: "Sprint Planning", transcript: "Maya: Let's scope. Devon: Tokenizing.", date: "2026-08-17" },
  },
  "meetings.update": {
    params: { id: "65b9c1f2d3a4e5b6c7d8e9f0" },
    payload: { title: "Sprint Planning - Updated" },
  },
  "meetings.delete": {
    params: { id: "65b9c1f2d3a4e5b6c7d8e9f0" },
  },
  "meetings.summarize": {
    params: { id: "65b9c1f2d3a4e5b6c7d8e9f0" },
  },
  "meetings.chat": {
    params: { id: "65b9c1f2d3a4e5b6c7d8e9f0" },
    payload: { message: "What did Nitish say?" },
  },
  "meetings.publish": {
    params: { id: "65b9c1f2d3a4e5b6c7d8e9f0" },
  },
  "meetings.archive": {
    params: { id: "65b9c1f2d3a4e5b6c7d8e9f0" },
  },
  "meetings.unarchive": {
    params: { id: "65b9c1f2d3a4e5b6c7d8e9f0" },
  },
  "meetings.restore": {
    params: { id: "65b9c1f2d3a4e5b6c7d8e9f0" },
  },
  "meetings.pin": {
    params: { id: "65b9c1f2d3a4e5b6c7d8e9f0" },
  },
  "meetings.clone": {
    payload: { meeting: { title: "Cloned Team Sync", transcript: "Maya: Reviewing roadmap notes." } },
  },
  "meetings.permanentDelete": {
    params: { id: "65b9c1f2d3a4e5b6c7d8e9f0" },
  },
  "meetings.publicShareGet": {
    params: { token: "share-token-xyz-123" },
  },
  "actionItems.list": {
    query: { page: 1, limit: 10, status: "Pending", priority: "High" },
  },
  "actionItems.get": {
    params: { id: "65b9c1f2d3a4e5b6c7d8e9f1" },
  },
  "actionItems.getByMeeting": {
    params: { meetingId: "65b9c1f2d3a4e5b6c7d8e9f0" },
  },
  "actionItems.create": {
    payload: {
      task: "Review design tokens",
      owner: "Devon Developer",
      dueDate: "2026-08-25",
      priority: "High",
      status: "Pending",
      meetingId: 1,
    },
  },
  "actionItems.update": {
    params: { id: "65b9c1f2d3a4e5b6c7d8e9f1" },
    payload: { status: "In Progress" },
  },
  "actionItems.delete": {
    params: { id: "65b9c1f2d3a4e5b6c7d8e9f1" },
  },
  "settings.update": {
    payload: { theme: "dark", language: "en", timezone: "America/New_York" },
  },
  "jobs.get": {
    params: { id: "job-uuid-12345" },
  },
  "audit.stats": {},
  "audit.logs": {
    query: { page: 1, limit: 20, statusGroup: "all" },
  },
};

export function generateDocs(): void {
  try {
    // 2. Generate Postman Collection
    const postmanItemsMap: Record<string, any[]> = {
      auth: [],
      meetings: [],
      actionItems: [],
      dashboard: [],
      settings: [],
      notifications: [],
      jobs: [],
      audit: [],
    };

    const registryEntries = Object.entries(serviceRegistry).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [id, def] of registryEntries) {
      const parts = id.split(".");
      const category = parts[0];
      const actionName = parts[1];

      const sample = sampleBodies[id] || {};
      const requestBodyObj: any = {
        serviceId: id,
      };
      if (sample.payload) requestBodyObj.payload = sample.payload;
      if (sample.params) requestBodyObj.params = sample.params;
      if (sample.query) requestBodyObj.query = sample.query;

      const headers = [{ key: "Content-Type", value: "application/json" }];
      if (def.requiresAuth) {
        headers.push({ key: "Authorization", value: "Bearer {{jwt_token}}" });
      }

      const item = {
        name: `${actionName} (${id})`,
        request: {
          method: "POST",
          header: headers,
          body: {
            mode: "raw",
            raw: JSON.stringify(requestBodyObj, null, 2),
          },
          url: {
            raw: "http://localhost:4000/api/service",
            protocol: "http",
            host: ["localhost"],
            port: "4000",
            path: ["api", "service"],
          },
        },
      };

      if (postmanItemsMap[category]) {
        postmanItemsMap[category].push(item);
      }
    }

    const categoriesOrder = ["auth", "meetings", "actionItems", "dashboard", "settings", "notifications", "jobs", "audit"];
    const foldersMap: Record<string, string> = {
      auth: "Authentication",
      meetings: "Meetings",
      actionItems: "Action Items",
      dashboard: "Dashboard",
      settings: "Settings",
      notifications: "Notifications",
      jobs: "Jobs",
      audit: "Audit & Security",
    };


    const postmanCollection = {
      info: {
        name: "Syncra AI Services Collection",
        description:
          "Postman collection detailing all Syncra AI Service Router endpoint requests. Auto-generated on server startup.",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: categoriesOrder.map((cat) => ({
        name: foldersMap[cat] || cat,
        item: postmanItemsMap[cat] || [],
      })),
    };

    const postmanPath = path.join(__dirname, "../../../../syncra_ai_postman_collection.json");
    fs.writeFileSync(postmanPath, JSON.stringify(postmanCollection, null, 2));
    console.log("[Docs Generator] Successfully updated syncra_ai_postman_collection.json");
  } catch (err) {
    console.error("[Docs Generator] Error generating API documentation files:", err);
  }
}
