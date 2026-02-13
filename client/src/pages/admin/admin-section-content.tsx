import { useState, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Download, Eye, Filter, Info, Loader2 } from "lucide-react";

const ChatLogsPanel = lazy(() => import("@/components/admin/chat-logs-panel"));
const AdminStrategicTimeline = lazy(() => import("./admin-strategic-timeline"));

const customPanelSections: Record<string, React.LazyExoticComponent<any>> = {
  "chat-logs": ChatLogsPanel,
  "strategic-timeline": AdminStrategicTimeline,
};

interface SectionMeta {
  title: string;
  description: string;
  kpis: { label: string; zeroValue: string; color: string }[];
  columns: string[];
  actions: string[];
}

const sectionMeta: Record<string, SectionMeta> = {
  trips: {
    title: "Trip Management",
    description: "Active, completed, and cancelled trips across the platform.",
    kpis: [
      { label: "Total Trips", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Active", zeroValue: "0", color: "border-t-emerald-500" },
      { label: "Completed", zeroValue: "0", color: "border-t-violet-500" },
      { label: "Cancelled", zeroValue: "0", color: "border-t-red-500" },
    ],
    columns: ["Trip ID", "Rider", "Driver", "Route", "Fare", "Status", "Date"],
    actions: ["Export", "Filter"],
  },
  reservations: {
    title: "Scheduled Reservations",
    description: "Advance bookings and scheduled ride reservations.",
    kpis: [
      { label: "Total", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Upcoming", zeroValue: "0", color: "border-t-amber-500" },
      { label: "Completed", zeroValue: "0", color: "border-t-emerald-500" },
      { label: "Cancelled", zeroValue: "0", color: "border-t-red-500" },
    ],
    columns: ["ID", "Rider", "Pickup", "Dropoff", "Scheduled", "Status"],
    actions: ["Export", "Filter"],
  },
  "ride-classes": {
    title: "Ride Class Management",
    description: "Manage ride classes, fare structures, and availability.",
    kpis: [
      { label: "Total Classes", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Active", zeroValue: "0", color: "border-t-emerald-500" },
      { label: "Requests Today", zeroValue: "0", color: "border-t-violet-500" },
    ],
    columns: ["Class", "Base Fare", "Per KM", "Per Min", "Min Fare", "Status"],
    actions: ["Export", "Filter"],
  },
  "driver-prefs": {
    title: "Driver Preferences",
    description: "Driver preference settings, restrictions, and warnings.",
    kpis: [
      { label: "Total Drivers", zeroValue: "0", color: "border-t-blue-500" },
      { label: "With Prefs", zeroValue: "0", color: "border-t-emerald-500" },
      { label: "Restricted", zeroValue: "0", color: "border-t-red-500" },
      { label: "Warnings", zeroValue: "0", color: "border-t-amber-500" },
    ],
    columns: ["Driver", "Distance", "Cash", "Areas", "Status"],
    actions: ["Export", "Filter"],
  },
  corporate: {
    title: "Corporate Rides",
    description: "Corporate accounts, employee rides, and billing management.",
    kpis: [
      { label: "Companies", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Active Employees", zeroValue: "0", color: "border-t-emerald-500" },
      { label: "Monthly Trips", zeroValue: "0", color: "border-t-violet-500" },
      { label: "Revenue", zeroValue: "\u20A60", color: "border-t-amber-500" },
    ],
    columns: ["Company", "Employees", "Budget Used", "Trips", "Status"],
    actions: ["Export", "Filter"],
  },
  "special-rides": {
    title: "Special Rides",
    description: "Special ride types including PetRide and SafeTeen.",
    kpis: [
      { label: "PetRide", zeroValue: "0", color: "border-t-blue-500" },
      { label: "SafeTeen", zeroValue: "0", color: "border-t-emerald-500" },
      { label: "Total Requests", zeroValue: "0", color: "border-t-violet-500" },
    ],
    columns: ["Type", "Description", "Requests", "Active", "Status"],
    actions: ["Export", "Filter"],
  },
  simulation: {
    title: "Trip Simulation",
    description: "Simulation controls for testing trip flows and scenarios.",
    kpis: [
      { label: "Simulations Run", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Active", zeroValue: "0", color: "border-t-emerald-500" },
      { label: "Success Rate", zeroValue: "\u2014", color: "border-t-violet-500" },
    ],
    columns: ["ID", "Type", "Riders", "Drivers", "Duration", "Status"],
    actions: ["Export", "Filter"],
  },
  "fee-settings": {
    title: "Fee Configuration",
    description: "Platform fee settings, commission rates, and surge configuration.",
    kpis: [
      { label: "Commission Rate", zeroValue: "\u2014", color: "border-t-blue-500" },
      { label: "Cancellation Fee", zeroValue: "\u20A60", color: "border-t-amber-500" },
      { label: "Surge Active", zeroValue: "\u2014", color: "border-t-red-500" },
    ],
    columns: ["Fee Type", "Amount", "Currency", "Last Updated", "Status"],
    actions: ["Export", "Filter"],
  },
  payouts: {
    title: "Driver Payouts",
    description: "Payout management, processing, and history.",
    kpis: [
      { label: "Total Paid", zeroValue: "\u20A60", color: "border-t-blue-500" },
      { label: "Pending", zeroValue: "\u20A60", color: "border-t-amber-500" },
      { label: "This Month", zeroValue: "\u20A60", color: "border-t-emerald-500" },
      { label: "Failed", zeroValue: "\u20A60", color: "border-t-red-500" },
    ],
    columns: ["Driver", "Amount", "Bank", "Reference", "Status", "Date"],
    actions: ["Export", "Filter"],
  },
  wallets: {
    title: "Wallet Management",
    description: "User wallet balances, activity, and flagged accounts.",
    kpis: [
      { label: "Total Wallets", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Total Balance", zeroValue: "\u20A60", color: "border-t-emerald-500" },
      { label: "Active", zeroValue: "0", color: "border-t-violet-500" },
      { label: "Flagged", zeroValue: "0", color: "border-t-red-500" },
    ],
    columns: ["User", "Role", "Balance", "Last Transaction", "Status"],
    actions: ["Export", "Filter"],
  },
  "wallet-funding": {
    title: "Wallet Funding",
    description: "Wallet funding requests and transaction history.",
    kpis: [
      { label: "Total Funded", zeroValue: "\u20A60", color: "border-t-blue-500" },
      { label: "Pending", zeroValue: "\u20A60", color: "border-t-amber-500" },
      { label: "This Week", zeroValue: "\u20A60", color: "border-t-emerald-500" },
    ],
    columns: ["User", "Amount", "Source", "Reference", "Status", "Date"],
    actions: ["Export", "Filter"],
  },
  "director-funding": {
    title: "Director Funding",
    description: "Director wallet operations and funding records.",
    kpis: [
      { label: "Directors", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Total Funded", zeroValue: "\u20A60", color: "border-t-emerald-500" },
      { label: "Pending", zeroValue: "\u20A60", color: "border-t-amber-500" },
    ],
    columns: ["Director", "Recipient", "Amount", "Purpose", "Status", "Date"],
    actions: ["Export", "Filter"],
  },
  "third-party-funding": {
    title: "Third-Party Funding",
    description: "Third-party wallet funding and external contributions.",
    kpis: [
      { label: "Funders", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Total Funded", zeroValue: "\u20A60", color: "border-t-emerald-500" },
      { label: "Active", zeroValue: "0", color: "border-t-violet-500" },
    ],
    columns: ["Funder", "Recipient", "Relationship", "Amount", "Status"],
    actions: ["Export", "Filter"],
  },
  refunds: {
    title: "Refund Management",
    description: "Refund processing, approvals, and dispute resolutions.",
    kpis: [
      { label: "Total Refunds", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Pending", zeroValue: "0", color: "border-t-amber-500" },
      { label: "Approved", zeroValue: "0", color: "border-t-emerald-500" },
      { label: "Rejected", zeroValue: "0", color: "border-t-red-500" },
    ],
    columns: ["ID", "User", "Trip", "Amount", "Reason", "Status", "Date"],
    actions: ["Export", "Filter"],
  },
  chargebacks: {
    title: "Chargeback Cases",
    description: "Chargeback management and evidence collection.",
    kpis: [
      { label: "Total", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Open", zeroValue: "0", color: "border-t-amber-500" },
      { label: "Resolved", zeroValue: "0", color: "border-t-emerald-500" },
      { label: "Amount at Risk", zeroValue: "\u20A60", color: "border-t-red-500" },
    ],
    columns: ["ID", "User", "Amount", "Reason", "Evidence", "Status"],
    actions: ["Export", "Filter"],
  },
  "bank-transfers": {
    title: "Bank Transfers",
    description: "Bank transfer records and reconciliation.",
    kpis: [
      { label: "Total Transfers", zeroValue: "0", color: "border-t-blue-500" },
      { label: "This Month", zeroValue: "0", color: "border-t-violet-500" },
      { label: "Success Rate", zeroValue: "\u2014", color: "border-t-emerald-500" },
    ],
    columns: ["ID", "User", "Bank", "Amount", "Reference", "Status", "Date"],
    actions: ["Export", "Filter"],
  },
  "cash-settlements": {
    title: "Cash Settlements",
    description: "Cash settlement tracking and driver remittance.",
    kpis: [
      { label: "Settlements", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Pending", zeroValue: "0", color: "border-t-amber-500" },
      { label: "Settled Amount", zeroValue: "\u20A60", color: "border-t-emerald-500" },
    ],
    columns: ["ID", "Driver", "Trip", "Amount", "Status", "Date"],
    actions: ["Export", "Filter"],
  },
  "cash-disputes": {
    title: "Cash Disputes",
    description: "Cash dispute resolution between riders and drivers.",
    kpis: [
      { label: "Total Disputes", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Open", zeroValue: "0", color: "border-t-amber-500" },
      { label: "Resolved", zeroValue: "0", color: "border-t-emerald-500" },
    ],
    columns: ["ID", "Trip", "Driver", "Rider", "Amount", "Status"],
    actions: ["Export", "Filter"],
  },
  "tax-documents": {
    title: "Tax Documents",
    description: "Tax statement generation and distribution.",
    kpis: [
      { label: "Generated", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Pending", zeroValue: "0", color: "border-t-amber-500" },
      { label: "This Year", zeroValue: "0", color: "border-t-emerald-500" },
    ],
    columns: ["User", "Type", "Period", "Format", "Status", "Date"],
    actions: ["Export", "Filter"],
  },
  ratings: {
    title: "Ratings Overview",
    description: "User ratings, reviews, and feedback management.",
    kpis: [
      { label: "Avg Driver Rating", zeroValue: "\u2014", color: "border-t-blue-500" },
      { label: "Avg Rider Rating", zeroValue: "\u2014", color: "border-t-emerald-500" },
      { label: "Total Reviews", zeroValue: "0", color: "border-t-violet-500" },
      { label: "Low Ratings", zeroValue: "0", color: "border-t-red-500" },
    ],
    columns: ["From", "To", "Rating", "Comment", "Trip", "Date"],
    actions: ["Export", "Filter"],
  },
  disputes: {
    title: "Dispute Resolution",
    description: "Dispute management and resolution tracking.",
    kpis: [
      { label: "Total", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Open", zeroValue: "0", color: "border-t-amber-500" },
      { label: "In Progress", zeroValue: "0", color: "border-t-violet-500" },
      { label: "Resolved", zeroValue: "0", color: "border-t-emerald-500" },
    ],
    columns: ["ID", "Type", "Reporter", "Against", "Description", "Status", "Date"],
    actions: ["Export", "Filter"],
  },
  inbox: {
    title: "Support Inbox",
    description: "Support messages and communication management.",
    kpis: [
      { label: "Total Messages", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Unread", zeroValue: "0", color: "border-t-amber-500" },
      { label: "Avg Response Time", zeroValue: "\u2014", color: "border-t-emerald-500" },
    ],
    columns: ["ID", "From", "Subject", "Priority", "Status", "Date"],
    actions: ["Export", "Filter"],
  },
  "help-center": {
    title: "Help Center",
    description: "Help articles, categories, and content management.",
    kpis: [
      { label: "Articles", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Categories", zeroValue: "0", color: "border-t-violet-500" },
      { label: "Views This Month", zeroValue: "0", color: "border-t-emerald-500" },
    ],
    columns: ["Title", "Category", "Views", "Last Updated", "Status"],
    actions: ["Export", "Filter"],
  },
  "support-logs": {
    title: "Support Logs",
    description: "Support activity logs and agent performance.",
    kpis: [
      { label: "Total Logs", zeroValue: "0", color: "border-t-blue-500" },
      { label: "This Week", zeroValue: "0", color: "border-t-violet-500" },
      { label: "Agents Active", zeroValue: "0", color: "border-t-emerald-500" },
    ],
    columns: ["ID", "Agent", "User", "Action", "Channel", "Date"],
    actions: ["Export", "Filter"],
  },
  fraud: {
    title: "Fraud Detection",
    description: "Fraud monitoring, alerts, and risk management.",
    kpis: [
      { label: "Alerts", zeroValue: "0", color: "border-t-blue-500" },
      { label: "High Risk", zeroValue: "0", color: "border-t-red-500" },
      { label: "Under Review", zeroValue: "0", color: "border-t-amber-500" },
      { label: "Blocked", zeroValue: "0", color: "border-t-red-500" },
    ],
    columns: ["ID", "User", "Type", "Risk Score", "Signals", "Status", "Date"],
    actions: ["Export", "Filter"],
  },
  safety: {
    title: "Safety Incidents",
    description: "Incident management and safety reporting.",
    kpis: [
      { label: "Total Incidents", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Open", zeroValue: "0", color: "border-t-amber-500" },
      { label: "Critical", zeroValue: "0", color: "border-t-red-500" },
      { label: "Resolved", zeroValue: "0", color: "border-t-emerald-500" },
    ],
    columns: ["ID", "Type", "Severity", "Reporter", "Location", "Status", "Date"],
    actions: ["Export", "Filter"],
  },
  "lost-items": {
    title: "Lost Items",
    description: "Lost item tracking and return coordination.",
    kpis: [
      { label: "Total Reports", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Pending", zeroValue: "0", color: "border-t-amber-500" },
      { label: "Returned", zeroValue: "0", color: "border-t-emerald-500" },
      { label: "Unclaimed", zeroValue: "0", color: "border-t-red-500" },
    ],
    columns: ["ID", "Trip", "Item", "Reporter", "Driver", "Status", "Date"],
    actions: ["Export", "Filter"],
  },
  "lost-item-fraud": {
    title: "Lost Item Fraud",
    description: "Fraudulent lost item claims investigation.",
    kpis: [
      { label: "Cases", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Confirmed Fraud", zeroValue: "0", color: "border-t-red-500" },
      { label: "Under Review", zeroValue: "0", color: "border-t-amber-500" },
    ],
    columns: ["ID", "Claim", "Reporter", "Evidence", "Risk", "Status"],
    actions: ["Export", "Filter"],
  },
  "accident-reports": {
    title: "Accident Reports",
    description: "Vehicle accident documentation and insurance claims.",
    kpis: [
      { label: "Total Reports", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Open Cases", zeroValue: "0", color: "border-t-amber-500" },
      { label: "Resolved", zeroValue: "0", color: "border-t-emerald-500" },
    ],
    columns: ["ID", "Driver", "Location", "Severity", "Insurance", "Status", "Date"],
    actions: ["Export", "Filter"],
  },
  insurance: {
    title: "Insurance Claims",
    description: "Insurance claim processing and coverage management.",
    kpis: [
      { label: "Total Claims", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Pending", zeroValue: "0", color: "border-t-amber-500" },
      { label: "Approved", zeroValue: "0", color: "border-t-emerald-500" },
      { label: "Total Paid", zeroValue: "\u20A60", color: "border-t-violet-500" },
    ],
    columns: ["ID", "Claimant", "Type", "Amount", "Status", "Date"],
    actions: ["Export", "Filter"],
  },
  "relief-fund": {
    title: "Relief Fund",
    description: "Emergency relief fund allocation and disbursement.",
    kpis: [
      { label: "Fund Balance", zeroValue: "\u20A60", color: "border-t-blue-500" },
      { label: "Disbursed", zeroValue: "\u20A60", color: "border-t-emerald-500" },
      { label: "Pending", zeroValue: "0", color: "border-t-amber-500" },
    ],
    columns: ["ID", "Recipient", "Amount", "Reason", "Status", "Date"],
    actions: ["Export", "Filter"],
  },
  "compliance-logs": {
    title: "Compliance Logs",
    description: "Regulatory compliance tracking and audit logs.",
    kpis: [
      { label: "Total Entries", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Flagged", zeroValue: "0", color: "border-t-red-500" },
      { label: "Reviewed", zeroValue: "0", color: "border-t-emerald-500" },
    ],
    columns: ["ID", "Type", "Entity", "Action", "Status", "Date"],
    actions: ["Export", "Filter"],
  },
  "store-compliance": {
    title: "Store Compliance",
    description: "App store compliance, updates, and policy adherence.",
    kpis: [
      { label: "Checks Passed", zeroValue: "0", color: "border-t-emerald-500" },
      { label: "Issues Found", zeroValue: "0", color: "border-t-red-500" },
      { label: "Last Audit", zeroValue: "\u2014", color: "border-t-blue-500" },
    ],
    columns: ["Check", "Platform", "Category", "Result", "Date"],
    actions: ["Export", "Filter"],
  },
  reports: {
    title: "Operational Reports",
    description: "Operational reporting, summaries, and data exports.",
    kpis: [
      { label: "Generated Reports", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Scheduled", zeroValue: "0", color: "border-t-violet-500" },
      { label: "Downloads", zeroValue: "0", color: "border-t-emerald-500" },
    ],
    columns: ["Name", "Type", "Period", "Format", "Status", "Date"],
    actions: ["Export", "Filter"],
  },
  growth: {
    title: "Growth Dashboard",
    description: "Growth metrics, trends, and performance indicators.",
    kpis: [
      { label: "Monthly Growth", zeroValue: "\u2014", color: "border-t-blue-500" },
      { label: "New Users", zeroValue: "0", color: "border-t-emerald-500" },
      { label: "Retention Rate", zeroValue: "\u2014", color: "border-t-violet-500" },
      { label: "Churn", zeroValue: "\u2014", color: "border-t-red-500" },
    ],
    columns: ["Month", "New Riders", "New Drivers", "Active Users", "Trips", "Revenue"],
    actions: ["Export", "Filter"],
  },
  "user-growth": {
    title: "User Growth Analytics",
    description: "User acquisition, retention, and growth tracking.",
    kpis: [
      { label: "Total Users", zeroValue: "0", color: "border-t-blue-500" },
      { label: "This Month", zeroValue: "0", color: "border-t-emerald-500" },
      { label: "Rider Growth", zeroValue: "\u2014", color: "border-t-violet-500" },
      { label: "Driver Growth", zeroValue: "\u2014", color: "border-t-amber-500" },
    ],
    columns: ["Period", "New Riders", "New Drivers", "Retention", "Source"],
    actions: ["Export", "Filter"],
  },
  incentives: {
    title: "Incentive Programs",
    description: "Incentive program management and redemption tracking.",
    kpis: [
      { label: "Active Programs", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Budget Used", zeroValue: "\u20A60", color: "border-t-amber-500" },
      { label: "Redemptions", zeroValue: "0", color: "border-t-emerald-500" },
    ],
    columns: ["Name", "Type", "Target", "Budget", "Redeemed", "Status"],
    actions: ["Export", "Filter"],
  },
  acquisition: {
    title: "User Acquisition",
    description: "Campaign management and user acquisition analytics.",
    kpis: [
      { label: "Campaigns", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Total Spend", zeroValue: "\u20A60", color: "border-t-amber-500" },
      { label: "Signups", zeroValue: "0", color: "border-t-emerald-500" },
      { label: "CPA", zeroValue: "\u2014", color: "border-t-violet-500" },
    ],
    columns: ["Campaign", "Channel", "Budget", "Signups", "CPA", "Status"],
    actions: ["Export", "Filter"],
  },
  countries: {
    title: "Country Management",
    description: "Multi-country operations and regional management.",
    kpis: [
      { label: "Countries Active", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Total Drivers", zeroValue: "0", color: "border-t-emerald-500" },
      { label: "Total Riders", zeroValue: "0", color: "border-t-violet-500" },
    ],
    columns: ["Country", "Currency", "Drivers", "Riders", "Status", "Launch Date"],
    actions: ["Export", "Filter"],
  },
  contracts: {
    title: "Enterprise Contracts",
    description: "Contract management and enterprise partnerships.",
    kpis: [
      { label: "Active Contracts", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Total Value", zeroValue: "\u20A60", color: "border-t-emerald-500" },
      { label: "Expiring Soon", zeroValue: "0", color: "border-t-amber-500" },
    ],
    columns: ["Company", "Type", "Value", "Start", "End", "Status"],
    actions: ["Export", "Filter"],
  },
  overrides: {
    title: "System Overrides",
    description: "Configuration overrides and system settings.",
    kpis: [
      { label: "Active Overrides", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Recent Changes", zeroValue: "0", color: "border-t-amber-500" },
    ],
    columns: ["Setting", "Default Value", "Override Value", "Set By", "Date"],
    actions: ["Export", "Filter"],
  },
  "zibra-insights": {
    title: "ZIBRA Insights",
    description: "AI analytics, conversation insights, and resolution metrics.",
    kpis: [
      { label: "Conversations", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Resolution Rate", zeroValue: "\u2014", color: "border-t-emerald-500" },
      { label: "Avg Response Time", zeroValue: "\u2014", color: "border-t-violet-500" },
      { label: "Satisfaction", zeroValue: "\u2014", color: "border-t-amber-500" },
    ],
    columns: ["Topic", "Queries", "Resolved", "Avg Time", "Satisfaction"],
    actions: ["Export", "Filter"],
  },
  "welcome-insights": {
    title: "Welcome Flow Analytics",
    description: "Onboarding metrics and user welcome flow analysis.",
    kpis: [
      { label: "Completions", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Drop-off Rate", zeroValue: "\u2014", color: "border-t-red-500" },
      { label: "Avg Time", zeroValue: "\u2014", color: "border-t-emerald-500" },
    ],
    columns: ["Step", "Views", "Completions", "Drop-off", "Avg Duration"],
    actions: ["Export", "Filter"],
  },
  "zibra-governance": {
    title: "ZIBRA Governance",
    description: "AI governance settings, rules, and escalation policies.",
    kpis: [
      { label: "Rules Active", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Escalations", zeroValue: "0", color: "border-t-amber-500" },
      { label: "Auto-resolutions", zeroValue: "0", color: "border-t-emerald-500" },
    ],
    columns: ["Rule", "Type", "Trigger", "Actions", "Status"],
    actions: ["Export", "Filter"],
  },
  "director-settings": {
    title: "Director Configuration",
    description: "Director settings, commission rates, and configurations.",
    kpis: [
      { label: "Active Directors", zeroValue: "0", color: "border-t-blue-500" },
      { label: "Commission Rate", zeroValue: "\u2014", color: "border-t-emerald-500" },
      { label: "Avg Performance", zeroValue: "\u2014", color: "border-t-violet-500" },
    ],
    columns: ["Setting", "Value", "Last Updated", "Updated By"],
    actions: ["Export", "Filter"],
  },
  "director-performance": {
    title: "Director Performance",
    description: "Performance metrics, DPS scores, and director rankings.",
    kpis: [
      { label: "Avg DPS", zeroValue: "\u2014", color: "border-t-blue-500" },
      { label: "Top Performer", zeroValue: "\u2014", color: "border-t-emerald-500" },
      { label: "Below Threshold", zeroValue: "0", color: "border-t-red-500" },
    ],
    columns: ["Director", "DPS Score", "Drivers Managed", "Revenue", "Tier", "Status"],
    actions: ["Export", "Filter"],
  },
  "ai-audit": {
    title: "AI Audit Log",
    description: "ZIBANA AI Command Layer usage history, query audit trail, and cost tracking.",
    kpis: [
      { label: "Total Queries", zeroValue: "0", color: "border-t-violet-500" },
      { label: "Monthly Spend", zeroValue: "$0.00", color: "border-t-blue-500" },
      { label: "Success Rate", zeroValue: "0%", color: "border-t-emerald-500" },
      { label: "Budget Remaining", zeroValue: "$12.00", color: "border-t-amber-500" },
    ],
    columns: ["Timestamp", "Admin", "Type", "Query", "Status"],
    actions: ["Export", "Filter"],
  },
};

const kpiColors = [
  "border-t-blue-500",
  "border-t-emerald-500",
  "border-t-violet-500",
  "border-t-amber-500",
];

interface Props {
  section: string;
  parentGroup: string;
  parentRoute: string;
}

function PreLaunchBanner() {
  return (
    <Card className="rounded-xl border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20" data-testid="banner-pre-launch">
      <CardContent className="flex items-start gap-3 py-4 px-5">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-200" data-testid="text-pre-launch-status">
            Platform Status: PRE-LAUNCH
          </p>
          <p className="text-sm text-blue-700/80 dark:text-blue-300/70 mt-0.5">
            No operational data available yet. Metrics will populate after go-live.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyTableState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-3" data-testid="empty-table-state">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Eye className="h-6 w-6 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No data available</p>
      <p className="text-xs text-slate-400 dark:text-slate-500">ZIBANA operations have not started.</p>
    </div>
  );
}

export default function AdminSectionContent({ section, parentGroup, parentRoute }: Props) {
  const { data: platformData } = useQuery<{ isLive: boolean; environment: string }>({
    queryKey: ["/api/admin/platform-settings"],
  });
  const isPreLaunch = !platformData?.isLive;

  const [searchQuery, setSearchQuery] = useState("");
  const meta = sectionMeta[section];

  const CustomPanel = customPanelSections[section];
  if (CustomPanel) {
    return (
      <div className="admin-fade-in space-y-6">
        <Link href={parentRoute}>
          <Button variant="ghost" size="sm" data-testid="button-back-to-parent">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to {parentGroup}
          </Button>
        </Link>
        <Suspense fallback={<div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
          <CustomPanel />
        </Suspense>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="admin-fade-in space-y-6">
        <Link href={parentRoute}>
          <Button variant="ghost" size="sm" data-testid="button-back-to-parent">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to {parentGroup}
          </Button>
        </Link>
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <Card className="rounded-xl shadow-xl shadow-slate-300/40 dark:shadow-slate-900/40 border border-slate-200 dark:border-slate-700 max-w-md w-full">
            <CardContent className="flex flex-col items-center py-12 px-6 space-y-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                <Eye className="h-7 w-7 text-slate-400" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100" data-testid="text-coming-soon-title">
                Section Coming Soon
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center" data-testid="text-coming-soon-section">
                The <span className="font-medium text-slate-700 dark:text-slate-300">{section}</span> section is under development.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-fade-in space-y-8">
      <Link href={parentRoute}>
        <Button variant="ghost" size="sm" data-testid="button-back-to-parent">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {parentGroup}
        </Button>
      </Link>

      {isPreLaunch && <PreLaunchBanner />}

      <div className="border-b border-slate-200 dark:border-slate-700 pb-5">
        <h1
          className="text-[28px] font-bold tracking-tight text-slate-800 dark:text-slate-100"
          data-testid="text-section-title"
        >
          {meta.title}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1" data-testid="text-section-description">
          {meta.description}
        </p>
      </div>

      <div
        className={`grid gap-6 ${
          meta.kpis.length <= 2
            ? "grid-cols-1 sm:grid-cols-2"
            : meta.kpis.length === 3
            ? "grid-cols-1 sm:grid-cols-3"
            : "grid-cols-2 sm:grid-cols-4"
        }`}
        data-testid="kpi-grid"
      >
        {meta.kpis.map((kpi, index) => (
          <Card
            key={kpi.label}
            className={`rounded-xl shadow-xl shadow-slate-300/40 dark:shadow-slate-900/40 border border-slate-200 dark:border-slate-700 border-t-4 ${kpi.color || kpiColors[index % kpiColors.length]}`}
            data-testid={`kpi-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}
          >
            <CardContent className="pt-5 pb-4 px-4">
              <p
                className="text-[13px] font-medium opacity-70 tracking-wide text-slate-500 dark:text-slate-400 uppercase mb-2"
                data-testid={`kpi-label-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {kpi.label}
              </p>
              <p
                className="font-extrabold text-slate-800 dark:text-slate-100 leading-tight"
                style={{ fontSize: "clamp(18px, 2.5vw, 26px)" }}
                data-testid={`kpi-value-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {isPreLaunch ? kpi.zeroValue : kpi.zeroValue}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-xl shadow-xl shadow-slate-300/40 dark:shadow-slate-900/40 border border-slate-200 dark:border-slate-700">
        <CardHeader className="gap-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold text-slate-800 dark:text-slate-100" data-testid="text-table-title">
              {meta.title}
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" data-testid="button-export">
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
              <Button variant="outline" size="sm" data-testid="button-filter">
                <Filter className="h-4 w-4 mr-1" /> Filter
              </Button>
            </div>
          </div>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search"
            />
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  {meta.columns.map((col) => (
                    <th
                      key={col}
                      className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isPreLaunch ? (
                  <tr>
                    <td colSpan={meta.columns.length}>
                      <EmptyTableState />
                    </td>
                  </tr>
                ) : (
                  <tr>
                    <td
                      colSpan={meta.columns.length}
                      className="py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                      data-testid="text-no-results"
                    >
                      No results found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
