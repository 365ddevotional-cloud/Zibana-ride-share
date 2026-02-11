import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Download, Eye, Filter } from "lucide-react";

interface SectionMeta {
  title: string;
  description: string;
  kpis: { label: string; value: string; color: string }[];
  columns: string[];
  rows: Record<string, string>[];
  actions: string[];
}

const sectionMeta: Record<string, SectionMeta> = {
  trips: {
    title: "Trip Management",
    description: "Active, completed, and cancelled trips across the platform.",
    kpis: [
      { label: "Total Trips", value: "12,847", color: "border-t-blue-500" },
      { label: "Active", value: "234", color: "border-t-emerald-500" },
      { label: "Completed", value: "11,982", color: "border-t-violet-500" },
      { label: "Cancelled", value: "631", color: "border-t-red-500" },
    ],
    columns: ["Trip ID", "Rider", "Driver", "Route", "Fare", "Status", "Date"],
    rows: [
      { "Trip ID": "TRP-4821", "Rider": "Fatima Bello", "Driver": "Adebayo Ogun", "Route": "Lekki → VI", "Fare": "₦3,200", "Status": "Completed", "Date": "2026-02-10" },
      { "Trip ID": "TRP-4822", "Rider": "Chukwuma Eze", "Driver": "Ibrahim Musa", "Route": "Ikeja → Surulere", "Fare": "₦2,800", "Status": "Active", "Date": "2026-02-11" },
      { "Trip ID": "TRP-4823", "Rider": "Aisha Yusuf", "Driver": "Okonkwo Nnamdi", "Route": "Abuja CBD → Wuse", "Fare": "₦1,500", "Status": "Completed", "Date": "2026-02-11" },
      { "Trip ID": "TRP-4824", "Rider": "Ngozi Okafor", "Driver": "Tunde Bakare", "Route": "Garki → Maitama", "Fare": "₦2,100", "Status": "Cancelled", "Date": "2026-02-11" },
      { "Trip ID": "TRP-4825", "Rider": "Emeka Udoh", "Driver": "Sani Danjuma", "Route": "PH GRA → Eleme", "Fare": "₦4,500", "Status": "Active", "Date": "2026-02-11" },
    ],
    actions: ["Export", "Filter"],
  },
  reservations: {
    title: "Scheduled Reservations",
    description: "Advance bookings and scheduled ride reservations.",
    kpis: [
      { label: "Total", value: "1,842", color: "border-t-blue-500" },
      { label: "Upcoming", value: "312", color: "border-t-amber-500" },
      { label: "Completed", value: "1,430", color: "border-t-emerald-500" },
      { label: "Cancelled", value: "100", color: "border-t-red-500" },
    ],
    columns: ["ID", "Rider", "Pickup", "Dropoff", "Scheduled", "Status"],
    rows: [
      { "ID": "RSV-1001", "Rider": "Fatima Bello", "Pickup": "Lekki Phase 1", "Dropoff": "Victoria Island", "Scheduled": "2026-02-12 08:00", "Status": "Upcoming" },
      { "ID": "RSV-1002", "Rider": "Adebayo Ogun", "Pickup": "Ikeja GRA", "Dropoff": "Lagos Airport", "Scheduled": "2026-02-12 14:30", "Status": "Upcoming" },
      { "ID": "RSV-1003", "Rider": "Chukwuma Eze", "Pickup": "Wuse 2", "Dropoff": "Nnamdi Azikiwe Airport", "Scheduled": "2026-02-11 06:00", "Status": "Completed" },
      { "ID": "RSV-1004", "Rider": "Aisha Yusuf", "Pickup": "Garki", "Dropoff": "Jabi", "Scheduled": "2026-02-13 10:00", "Status": "Cancelled" },
    ],
    actions: ["Export", "Filter"],
  },
  "ride-classes": {
    title: "Ride Class Management",
    description: "Manage ride classes, fare structures, and availability.",
    kpis: [
      { label: "Total Classes", value: "6", color: "border-t-blue-500" },
      { label: "Active", value: "5", color: "border-t-emerald-500" },
      { label: "Requests Today", value: "1,203", color: "border-t-violet-500" },
    ],
    columns: ["Class", "Base Fare", "Per KM", "Per Min", "Min Fare", "Status"],
    rows: [
      { "Class": "ZibaX", "Base Fare": "₦500", "Per KM": "₦150", "Per Min": "₦30", "Min Fare": "₦800", "Status": "Active" },
      { "Class": "ZibaXL", "Base Fare": "₦800", "Per KM": "₦200", "Per Min": "₦40", "Min Fare": "₦1,200", "Status": "Active" },
      { "Class": "ZibaComfort", "Base Fare": "₦700", "Per KM": "₦180", "Per Min": "₦35", "Min Fare": "₦1,000", "Status": "Active" },
      { "Class": "ZibaLux", "Base Fare": "₦1,500", "Per KM": "₦350", "Per Min": "₦60", "Min Fare": "₦2,500", "Status": "Active" },
      { "Class": "ZibaShare", "Base Fare": "₦300", "Per KM": "₦100", "Per Min": "₦20", "Min Fare": "₦500", "Status": "Pending" },
    ],
    actions: ["Export", "Filter"],
  },
  "driver-prefs": {
    title: "Driver Preferences",
    description: "Driver preference settings, restrictions, and warnings.",
    kpis: [
      { label: "Total Drivers", value: "3,412", color: "border-t-blue-500" },
      { label: "With Prefs", value: "2,891", color: "border-t-emerald-500" },
      { label: "Restricted", value: "45", color: "border-t-red-500" },
      { label: "Warnings", value: "128", color: "border-t-amber-500" },
    ],
    columns: ["Driver", "Distance", "Cash", "Areas", "Status"],
    rows: [
      { "Driver": "Adebayo Ogun", "Distance": "25 km max", "Cash": "Enabled", "Areas": "Lagos Mainland", "Status": "Active" },
      { "Driver": "Ibrahim Musa", "Distance": "30 km max", "Cash": "Disabled", "Areas": "Abuja Central", "Status": "Active" },
      { "Driver": "Okonkwo Nnamdi", "Distance": "15 km max", "Cash": "Enabled", "Areas": "Port Harcourt", "Status": "Pending" },
      { "Driver": "Sani Danjuma", "Distance": "40 km max", "Cash": "Enabled", "Areas": "Kano Metro", "Status": "Active" },
    ],
    actions: ["Export", "Filter"],
  },
  corporate: {
    title: "Corporate Rides",
    description: "Corporate accounts, employee rides, and billing management.",
    kpis: [
      { label: "Companies", value: "24", color: "border-t-blue-500" },
      { label: "Active Employees", value: "1,842", color: "border-t-emerald-500" },
      { label: "Monthly Trips", value: "8,320", color: "border-t-violet-500" },
      { label: "Revenue", value: "₦14.2M", color: "border-t-amber-500" },
    ],
    columns: ["Company", "Employees", "Budget Used", "Trips", "Status"],
    rows: [
      { "Company": "Dangote Industries", "Employees": "320", "Budget Used": "₦4,200,000", "Trips": "2,140", "Status": "Active" },
      { "Company": "GTBank", "Employees": "185", "Budget Used": "₦2,800,000", "Trips": "1,520", "Status": "Active" },
      { "Company": "MTN Nigeria", "Employees": "420", "Budget Used": "₦3,100,000", "Trips": "1,980", "Status": "Active" },
      { "Company": "Access Holdings", "Employees": "210", "Budget Used": "₦1,900,000", "Trips": "890", "Status": "Pending" },
    ],
    actions: ["Export", "Filter"],
  },
  "special-rides": {
    title: "Special Rides",
    description: "Special ride types including PetRide and SafeTeen.",
    kpis: [
      { label: "PetRide", value: "342", color: "border-t-blue-500" },
      { label: "SafeTeen", value: "518", color: "border-t-emerald-500" },
      { label: "Total Requests", value: "860", color: "border-t-violet-500" },
    ],
    columns: ["Type", "Description", "Requests", "Active", "Status"],
    rows: [
      { "Type": "PetRide", "Description": "Pet-friendly rides with trained drivers", "Requests": "342", "Active": "28", "Status": "Active" },
      { "Type": "SafeTeen", "Description": "Safe rides for teenagers with guardian tracking", "Requests": "518", "Active": "45", "Status": "Active" },
      { "Type": "AssistRide", "Description": "Accessibility-focused rides", "Requests": "124", "Active": "12", "Status": "Pending" },
    ],
    actions: ["Export", "Filter"],
  },
  simulation: {
    title: "Trip Simulation",
    description: "Simulation controls for testing trip flows and scenarios.",
    kpis: [
      { label: "Simulations Run", value: "482", color: "border-t-blue-500" },
      { label: "Active", value: "3", color: "border-t-emerald-500" },
      { label: "Success Rate", value: "94.2%", color: "border-t-violet-500" },
    ],
    columns: ["ID", "Type", "Riders", "Drivers", "Duration", "Status"],
    rows: [
      { "ID": "SIM-101", "Type": "Peak Hour", "Riders": "50", "Drivers": "30", "Duration": "15 min", "Status": "Completed" },
      { "ID": "SIM-102", "Type": "Surge Pricing", "Riders": "100", "Drivers": "20", "Duration": "30 min", "Status": "Active" },
      { "ID": "SIM-103", "Type": "Rain Scenario", "Riders": "75", "Drivers": "25", "Duration": "20 min", "Status": "Completed" },
      { "ID": "SIM-104", "Type": "New Driver Onboard", "Riders": "10", "Drivers": "5", "Duration": "10 min", "Status": "Pending" },
    ],
    actions: ["Export", "Filter"],
  },
  "fee-settings": {
    title: "Fee Configuration",
    description: "Platform fee settings, commission rates, and surge configuration.",
    kpis: [
      { label: "Commission Rate", value: "20%", color: "border-t-blue-500" },
      { label: "Cancellation Fee", value: "₦500", color: "border-t-amber-500" },
      { label: "Surge Active", value: "Yes", color: "border-t-red-500" },
    ],
    columns: ["Fee Type", "Amount", "Currency", "Last Updated", "Status"],
    rows: [
      { "Fee Type": "Platform Commission", "Amount": "20%", "Currency": "NGN", "Last Updated": "2026-01-15", "Status": "Active" },
      { "Fee Type": "Cancellation Fee", "Amount": "₦500", "Currency": "NGN", "Last Updated": "2026-01-20", "Status": "Active" },
      { "Fee Type": "Booking Fee", "Amount": "₦100", "Currency": "NGN", "Last Updated": "2026-02-01", "Status": "Active" },
      { "Fee Type": "Wait Time (per min)", "Amount": "₦50", "Currency": "NGN", "Last Updated": "2026-01-10", "Status": "Active" },
      { "Fee Type": "Surge Multiplier Cap", "Amount": "2.5x", "Currency": "NGN", "Last Updated": "2026-02-05", "Status": "Active" },
    ],
    actions: ["Export", "Filter"],
  },
  payouts: {
    title: "Driver Payouts",
    description: "Payout management, processing, and history.",
    kpis: [
      { label: "Total Paid", value: "₦84.3M", color: "border-t-blue-500" },
      { label: "Pending", value: "₦2.1M", color: "border-t-amber-500" },
      { label: "This Month", value: "₦12.8M", color: "border-t-emerald-500" },
      { label: "Failed", value: "₦340K", color: "border-t-red-500" },
    ],
    columns: ["Driver", "Amount", "Bank", "Reference", "Status", "Date"],
    rows: [
      { "Driver": "Adebayo Ogun", "Amount": "₦185,000", "Bank": "GTBank", "Reference": "PAY-88201", "Status": "Completed", "Date": "2026-02-10" },
      { "Driver": "Ibrahim Musa", "Amount": "₦142,500", "Bank": "Access Bank", "Reference": "PAY-88202", "Status": "Pending", "Date": "2026-02-11" },
      { "Driver": "Tunde Bakare", "Amount": "₦98,300", "Bank": "First Bank", "Reference": "PAY-88203", "Status": "Completed", "Date": "2026-02-09" },
      { "Driver": "Sani Danjuma", "Amount": "₦210,000", "Bank": "Zenith Bank", "Reference": "PAY-88204", "Status": "Failed", "Date": "2026-02-11" },
    ],
    actions: ["Export", "Filter"],
  },
  wallets: {
    title: "Wallet Management",
    description: "User wallet balances, activity, and flagged accounts.",
    kpis: [
      { label: "Total Wallets", value: "18,432", color: "border-t-blue-500" },
      { label: "Total Balance", value: "₦42.1M", color: "border-t-emerald-500" },
      { label: "Active", value: "15,210", color: "border-t-violet-500" },
      { label: "Flagged", value: "23", color: "border-t-red-500" },
    ],
    columns: ["User", "Role", "Balance", "Last Transaction", "Status"],
    rows: [
      { "User": "Fatima Bello", "Role": "Rider", "Balance": "₦12,500", "Last Transaction": "2026-02-11", "Status": "Active" },
      { "User": "Adebayo Ogun", "Role": "Driver", "Balance": "₦85,200", "Last Transaction": "2026-02-10", "Status": "Active" },
      { "User": "Chukwuma Eze", "Role": "Rider", "Balance": "₦3,100", "Last Transaction": "2026-02-09", "Status": "Active" },
      { "User": "Ngozi Okafor", "Role": "Rider", "Balance": "₦0", "Last Transaction": "2026-01-28", "Status": "Pending" },
    ],
    actions: ["Export", "Filter"],
  },
  "wallet-funding": {
    title: "Wallet Funding",
    description: "Wallet funding requests and transaction history.",
    kpis: [
      { label: "Total Funded", value: "₦28.4M", color: "border-t-blue-500" },
      { label: "Pending", value: "₦420K", color: "border-t-amber-500" },
      { label: "This Week", value: "₦3.2M", color: "border-t-emerald-500" },
    ],
    columns: ["User", "Amount", "Source", "Reference", "Status", "Date"],
    rows: [
      { "User": "Fatima Bello", "Amount": "₦10,000", "Source": "Card", "Reference": "FND-5501", "Status": "Completed", "Date": "2026-02-11" },
      { "User": "Emeka Udoh", "Amount": "₦25,000", "Source": "Bank Transfer", "Reference": "FND-5502", "Status": "Pending", "Date": "2026-02-11" },
      { "User": "Aisha Yusuf", "Amount": "₦5,000", "Source": "Card", "Reference": "FND-5503", "Status": "Completed", "Date": "2026-02-10" },
    ],
    actions: ["Export", "Filter"],
  },
  "director-funding": {
    title: "Director Funding",
    description: "Director wallet operations and funding records.",
    kpis: [
      { label: "Directors", value: "18", color: "border-t-blue-500" },
      { label: "Total Funded", value: "₦6.8M", color: "border-t-emerald-500" },
      { label: "Pending", value: "₦280K", color: "border-t-amber-500" },
    ],
    columns: ["Director", "Recipient", "Amount", "Purpose", "Status", "Date"],
    rows: [
      { "Director": "Chief Okafor", "Recipient": "Adebayo Ogun", "Amount": "₦50,000", "Purpose": "Driver Incentive", "Status": "Completed", "Date": "2026-02-10" },
      { "Director": "Alhaji Suleiman", "Recipient": "Ibrahim Musa", "Amount": "₦35,000", "Purpose": "Fuel Support", "Status": "Pending", "Date": "2026-02-11" },
      { "Director": "Mrs. Adeyemi", "Recipient": "Tunde Bakare", "Amount": "₦45,000", "Purpose": "Bonus Payout", "Status": "Completed", "Date": "2026-02-09" },
    ],
    actions: ["Export", "Filter"],
  },
  "third-party-funding": {
    title: "Third-Party Funding",
    description: "Third-party wallet funding and external contributions.",
    kpis: [
      { label: "Funders", value: "42", color: "border-t-blue-500" },
      { label: "Total Funded", value: "₦8.2M", color: "border-t-emerald-500" },
      { label: "Active", value: "38", color: "border-t-violet-500" },
    ],
    columns: ["Funder", "Recipient", "Relationship", "Amount", "Status"],
    rows: [
      { "Funder": "Bola Tinubu Jr.", "Recipient": "Fatima Bello", "Relationship": "Family", "Amount": "₦20,000", "Status": "Active" },
      { "Funder": "Kemi Adeosun", "Recipient": "Chukwuma Eze", "Relationship": "Employer", "Amount": "₦15,000", "Status": "Active" },
      { "Funder": "David Nwankwo", "Recipient": "Aisha Yusuf", "Relationship": "Friend", "Amount": "₦10,000", "Status": "Pending" },
    ],
    actions: ["Export", "Filter"],
  },
  refunds: {
    title: "Refund Management",
    description: "Refund processing, approvals, and dispute resolutions.",
    kpis: [
      { label: "Total Refunds", value: "842", color: "border-t-blue-500" },
      { label: "Pending", value: "34", color: "border-t-amber-500" },
      { label: "Approved", value: "756", color: "border-t-emerald-500" },
      { label: "Rejected", value: "52", color: "border-t-red-500" },
    ],
    columns: ["ID", "User", "Trip", "Amount", "Reason", "Status", "Date"],
    rows: [
      { "ID": "REF-3301", "User": "Fatima Bello", "Trip": "TRP-4801", "Amount": "₦3,200", "Reason": "Driver no-show", "Status": "Approved", "Date": "2026-02-10" },
      { "ID": "REF-3302", "User": "Emeka Udoh", "Trip": "TRP-4789", "Amount": "₦1,800", "Reason": "Overcharged", "Status": "Pending", "Date": "2026-02-11" },
      { "ID": "REF-3303", "User": "Aisha Yusuf", "Trip": "TRP-4795", "Amount": "₦2,500", "Reason": "Wrong route", "Status": "Approved", "Date": "2026-02-09" },
      { "ID": "REF-3304", "User": "Ngozi Okafor", "Trip": "TRP-4810", "Amount": "₦500", "Reason": "Duplicate charge", "Status": "Rejected", "Date": "2026-02-08" },
    ],
    actions: ["Export", "Filter"],
  },
  chargebacks: {
    title: "Chargeback Cases",
    description: "Chargeback management and evidence collection.",
    kpis: [
      { label: "Total", value: "128", color: "border-t-blue-500" },
      { label: "Open", value: "18", color: "border-t-amber-500" },
      { label: "Resolved", value: "104", color: "border-t-emerald-500" },
      { label: "Amount at Risk", value: "₦1.4M", color: "border-t-red-500" },
    ],
    columns: ["ID", "User", "Amount", "Reason", "Evidence", "Status"],
    rows: [
      { "ID": "CHB-201", "User": "Chukwuma Eze", "Amount": "₦15,000", "Reason": "Unauthorized transaction", "Evidence": "Card statement", "Status": "Under Review" },
      { "ID": "CHB-202", "User": "Fatima Bello", "Amount": "₦8,200", "Reason": "Service not rendered", "Evidence": "Trip logs", "Status": "Resolved" },
      { "ID": "CHB-203", "User": "Emeka Udoh", "Amount": "₦22,000", "Reason": "Duplicate charge", "Evidence": "Payment receipt", "Status": "Pending" },
    ],
    actions: ["Export", "Filter"],
  },
  "bank-transfers": {
    title: "Bank Transfers",
    description: "Bank transfer records and reconciliation.",
    kpis: [
      { label: "Total Transfers", value: "6,842", color: "border-t-blue-500" },
      { label: "This Month", value: "1,203", color: "border-t-violet-500" },
      { label: "Success Rate", value: "98.4%", color: "border-t-emerald-500" },
    ],
    columns: ["ID", "User", "Bank", "Amount", "Reference", "Status", "Date"],
    rows: [
      { "ID": "BNK-7701", "User": "Adebayo Ogun", "Bank": "GTBank", "Amount": "₦185,000", "Reference": "TRF-44201", "Status": "Completed", "Date": "2026-02-10" },
      { "ID": "BNK-7702", "User": "Ibrahim Musa", "Bank": "Access Bank", "Amount": "₦92,500", "Reference": "TRF-44202", "Status": "Completed", "Date": "2026-02-11" },
      { "ID": "BNK-7703", "User": "Tunde Bakare", "Bank": "First Bank", "Amount": "₦45,000", "Reference": "TRF-44203", "Status": "Failed", "Date": "2026-02-11" },
      { "ID": "BNK-7704", "User": "Sani Danjuma", "Bank": "Zenith Bank", "Amount": "₦120,000", "Reference": "TRF-44204", "Status": "Completed", "Date": "2026-02-09" },
    ],
    actions: ["Export", "Filter"],
  },
  "cash-settlements": {
    title: "Cash Settlements",
    description: "Cash settlement tracking and driver remittance.",
    kpis: [
      { label: "Settlements", value: "2,340", color: "border-t-blue-500" },
      { label: "Pending", value: "89", color: "border-t-amber-500" },
      { label: "Settled Amount", value: "₦18.6M", color: "border-t-emerald-500" },
    ],
    columns: ["ID", "Driver", "Trip", "Amount", "Status", "Date"],
    rows: [
      { "ID": "CST-601", "Driver": "Adebayo Ogun", "Trip": "TRP-4801", "Amount": "₦2,560", "Status": "Completed", "Date": "2026-02-10" },
      { "ID": "CST-602", "Driver": "Ibrahim Musa", "Trip": "TRP-4812", "Amount": "₦3,400", "Status": "Pending", "Date": "2026-02-11" },
      { "ID": "CST-603", "Driver": "Okonkwo Nnamdi", "Trip": "TRP-4820", "Amount": "₦1,800", "Status": "Completed", "Date": "2026-02-11" },
    ],
    actions: ["Export", "Filter"],
  },
  "cash-disputes": {
    title: "Cash Disputes",
    description: "Cash dispute resolution between riders and drivers.",
    kpis: [
      { label: "Total Disputes", value: "184", color: "border-t-blue-500" },
      { label: "Open", value: "12", color: "border-t-amber-500" },
      { label: "Resolved", value: "172", color: "border-t-emerald-500" },
    ],
    columns: ["ID", "Trip", "Driver", "Rider", "Amount", "Status"],
    rows: [
      { "ID": "CSD-301", "Trip": "TRP-4790", "Driver": "Adebayo Ogun", "Rider": "Fatima Bello", "Amount": "₦1,200", "Status": "Resolved" },
      { "ID": "CSD-302", "Trip": "TRP-4805", "Driver": "Ibrahim Musa", "Rider": "Chukwuma Eze", "Amount": "₦800", "Status": "Pending" },
      { "ID": "CSD-303", "Trip": "TRP-4818", "Driver": "Tunde Bakare", "Rider": "Aisha Yusuf", "Amount": "₦2,000", "Status": "Resolved" },
    ],
    actions: ["Export", "Filter"],
  },
  "tax-documents": {
    title: "Tax Documents",
    description: "Tax statement generation and distribution.",
    kpis: [
      { label: "Generated", value: "3,241", color: "border-t-blue-500" },
      { label: "Pending", value: "128", color: "border-t-amber-500" },
      { label: "This Year", value: "3,241", color: "border-t-emerald-500" },
    ],
    columns: ["User", "Type", "Period", "Format", "Status", "Date"],
    rows: [
      { "User": "Adebayo Ogun", "Type": "Annual Statement", "Period": "2025", "Format": "PDF", "Status": "Completed", "Date": "2026-01-31" },
      { "User": "Ibrahim Musa", "Type": "Quarterly Summary", "Period": "Q4 2025", "Format": "PDF", "Status": "Completed", "Date": "2026-01-15" },
      { "User": "Tunde Bakare", "Type": "Annual Statement", "Period": "2025", "Format": "CSV", "Status": "Pending", "Date": "2026-02-10" },
    ],
    actions: ["Export", "Filter"],
  },
  ratings: {
    title: "Ratings Overview",
    description: "User ratings, reviews, and feedback management.",
    kpis: [
      { label: "Avg Driver Rating", value: "4.72", color: "border-t-blue-500" },
      { label: "Avg Rider Rating", value: "4.85", color: "border-t-emerald-500" },
      { label: "Total Reviews", value: "24,831", color: "border-t-violet-500" },
      { label: "Low Ratings", value: "342", color: "border-t-red-500" },
    ],
    columns: ["From", "To", "Rating", "Comment", "Trip", "Date"],
    rows: [
      { "From": "Fatima Bello", "To": "Adebayo Ogun", "Rating": "5.0", "Comment": "Excellent driver, very professional", "Trip": "TRP-4821", "Date": "2026-02-10" },
      { "From": "Adebayo Ogun", "To": "Fatima Bello", "Rating": "4.5", "Comment": "Polite rider", "Trip": "TRP-4821", "Date": "2026-02-10" },
      { "From": "Chukwuma Eze", "To": "Ibrahim Musa", "Rating": "3.0", "Comment": "Took wrong route initially", "Trip": "TRP-4822", "Date": "2026-02-11" },
      { "From": "Aisha Yusuf", "To": "Okonkwo Nnamdi", "Rating": "4.8", "Comment": "Smooth ride, clean car", "Trip": "TRP-4823", "Date": "2026-02-11" },
    ],
    actions: ["Export", "Filter"],
  },
  disputes: {
    title: "Dispute Resolution",
    description: "Dispute management and resolution tracking.",
    kpis: [
      { label: "Total", value: "648", color: "border-t-blue-500" },
      { label: "Open", value: "42", color: "border-t-amber-500" },
      { label: "In Progress", value: "18", color: "border-t-violet-500" },
      { label: "Resolved", value: "588", color: "border-t-emerald-500" },
    ],
    columns: ["ID", "Type", "Reporter", "Against", "Description", "Status", "Date"],
    rows: [
      { "ID": "DSP-901", "Type": "Fare Dispute", "Reporter": "Fatima Bello", "Against": "Adebayo Ogun", "Description": "Charged higher than estimate", "Status": "Resolved", "Date": "2026-02-09" },
      { "ID": "DSP-902", "Type": "Service Quality", "Reporter": "Emeka Udoh", "Against": "Sani Danjuma", "Description": "Rude behavior during trip", "Status": "In Progress", "Date": "2026-02-10" },
      { "ID": "DSP-903", "Type": "Route Dispute", "Reporter": "Aisha Yusuf", "Against": "Tunde Bakare", "Description": "Unnecessary detour taken", "Status": "Pending", "Date": "2026-02-11" },
    ],
    actions: ["Export", "Filter"],
  },
  inbox: {
    title: "Support Inbox",
    description: "Support messages and communication management.",
    kpis: [
      { label: "Total Messages", value: "4,218", color: "border-t-blue-500" },
      { label: "Unread", value: "89", color: "border-t-amber-500" },
      { label: "Avg Response Time", value: "2.4 hrs", color: "border-t-emerald-500" },
    ],
    columns: ["ID", "From", "Subject", "Priority", "Status", "Date"],
    rows: [
      { "ID": "MSG-1201", "From": "Fatima Bello", "Subject": "Payment not reflected", "Priority": "High", "Status": "Pending", "Date": "2026-02-11" },
      { "ID": "MSG-1202", "From": "Adebayo Ogun", "Subject": "Payout delay inquiry", "Priority": "Medium", "Status": "Active", "Date": "2026-02-11" },
      { "ID": "MSG-1203", "From": "Chukwuma Eze", "Subject": "Account verification issue", "Priority": "Low", "Status": "Resolved", "Date": "2026-02-10" },
      { "ID": "MSG-1204", "From": "Aisha Yusuf", "Subject": "Lost item report follow-up", "Priority": "High", "Status": "Pending", "Date": "2026-02-11" },
    ],
    actions: ["Export", "Filter"],
  },
  "help-center": {
    title: "Help Center",
    description: "Help articles, categories, and content management.",
    kpis: [
      { label: "Articles", value: "142", color: "border-t-blue-500" },
      { label: "Categories", value: "12", color: "border-t-violet-500" },
      { label: "Views This Month", value: "18,420", color: "border-t-emerald-500" },
    ],
    columns: ["Title", "Category", "Views", "Last Updated", "Status"],
    rows: [
      { "Title": "How to request a ride", "Category": "Getting Started", "Views": "3,421", "Last Updated": "2026-01-20", "Status": "Active" },
      { "Title": "Payment methods explained", "Category": "Payments", "Views": "2,891", "Last Updated": "2026-02-01", "Status": "Active" },
      { "Title": "Driver registration guide", "Category": "For Drivers", "Views": "1,842", "Last Updated": "2026-01-15", "Status": "Active" },
      { "Title": "Safety features overview", "Category": "Safety", "Views": "1,205", "Last Updated": "2026-02-05", "Status": "Pending" },
    ],
    actions: ["Export", "Filter"],
  },
  "support-logs": {
    title: "Support Logs",
    description: "Support activity logs and agent performance.",
    kpis: [
      { label: "Total Logs", value: "12,480", color: "border-t-blue-500" },
      { label: "This Week", value: "842", color: "border-t-violet-500" },
      { label: "Agents Active", value: "8", color: "border-t-emerald-500" },
    ],
    columns: ["ID", "Agent", "User", "Action", "Channel", "Date"],
    rows: [
      { "ID": "LOG-8801", "Agent": "Kemi Adeboye", "User": "Fatima Bello", "Action": "Resolved payment issue", "Channel": "Chat", "Date": "2026-02-11" },
      { "ID": "LOG-8802", "Agent": "David Nwankwo", "User": "Adebayo Ogun", "Action": "Escalated payout delay", "Channel": "Email", "Date": "2026-02-11" },
      { "ID": "LOG-8803", "Agent": "Amina Abdullahi", "User": "Chukwuma Eze", "Action": "Account verification assist", "Channel": "Phone", "Date": "2026-02-10" },
    ],
    actions: ["Export", "Filter"],
  },
  fraud: {
    title: "Fraud Detection",
    description: "Fraud monitoring, alerts, and risk management.",
    kpis: [
      { label: "Alerts", value: "284", color: "border-t-blue-500" },
      { label: "High Risk", value: "18", color: "border-t-red-500" },
      { label: "Under Review", value: "42", color: "border-t-amber-500" },
      { label: "Blocked", value: "12", color: "border-t-red-500" },
    ],
    columns: ["ID", "User", "Type", "Risk Score", "Signals", "Status", "Date"],
    rows: [
      { "ID": "FRD-401", "User": "Unknown User 1", "Type": "Multiple accounts", "Risk Score": "92", "Signals": "Same device, diff emails", "Status": "Blocked", "Date": "2026-02-10" },
      { "ID": "FRD-402", "User": "Suspicious Driver 3", "Type": "GPS spoofing", "Risk Score": "85", "Signals": "Impossible speed pattern", "Status": "Under Review", "Date": "2026-02-11" },
      { "ID": "FRD-403", "User": "Account XY442", "Type": "Payment fraud", "Risk Score": "78", "Signals": "Stolen card detected", "Status": "Blocked", "Date": "2026-02-09" },
      { "ID": "FRD-404", "User": "Driver ACC-891", "Type": "Fare manipulation", "Risk Score": "65", "Signals": "Unusual route patterns", "Status": "Under Review", "Date": "2026-02-11" },
    ],
    actions: ["Export", "Filter"],
  },
  safety: {
    title: "Safety Incidents",
    description: "Incident management and safety reporting.",
    kpis: [
      { label: "Total Incidents", value: "182", color: "border-t-blue-500" },
      { label: "Open", value: "8", color: "border-t-amber-500" },
      { label: "Critical", value: "3", color: "border-t-red-500" },
      { label: "Resolved", value: "171", color: "border-t-emerald-500" },
    ],
    columns: ["ID", "Type", "Severity", "Reporter", "Location", "Status", "Date"],
    rows: [
      { "ID": "SAF-501", "Type": "SOS Triggered", "Severity": "Critical", "Reporter": "Fatima Bello", "Location": "Lekki, Lagos", "Status": "Resolved", "Date": "2026-02-08" },
      { "ID": "SAF-502", "Type": "Harassment Report", "Severity": "High", "Reporter": "Aisha Yusuf", "Location": "Wuse, Abuja", "Status": "In Progress", "Date": "2026-02-10" },
      { "ID": "SAF-503", "Type": "Reckless Driving", "Severity": "Medium", "Reporter": "Chukwuma Eze", "Location": "Ikeja, Lagos", "Status": "Resolved", "Date": "2026-02-09" },
      { "ID": "SAF-504", "Type": "Vehicle Condition", "Severity": "Low", "Reporter": "Emeka Udoh", "Location": "PH GRA", "Status": "Pending", "Date": "2026-02-11" },
    ],
    actions: ["Export", "Filter"],
  },
  "lost-items": {
    title: "Lost Items",
    description: "Lost item tracking and return coordination.",
    kpis: [
      { label: "Total Reports", value: "423", color: "border-t-blue-500" },
      { label: "Pending", value: "34", color: "border-t-amber-500" },
      { label: "Returned", value: "356", color: "border-t-emerald-500" },
      { label: "Unclaimed", value: "33", color: "border-t-red-500" },
    ],
    columns: ["ID", "Trip", "Item", "Reporter", "Driver", "Status", "Date"],
    rows: [
      { "ID": "LST-201", "Trip": "TRP-4780", "Item": "iPhone 15 Pro", "Reporter": "Fatima Bello", "Driver": "Adebayo Ogun", "Status": "Returned", "Date": "2026-02-09" },
      { "ID": "LST-202", "Trip": "TRP-4795", "Item": "Laptop Bag", "Reporter": "Chukwuma Eze", "Driver": "Ibrahim Musa", "Status": "Pending", "Date": "2026-02-10" },
      { "ID": "LST-203", "Trip": "TRP-4810", "Item": "Wallet", "Reporter": "Emeka Udoh", "Driver": "Tunde Bakare", "Status": "Returned", "Date": "2026-02-11" },
    ],
    actions: ["Export", "Filter"],
  },
  "lost-item-fraud": {
    title: "Lost Item Fraud",
    description: "Fraudulent lost item claims investigation.",
    kpis: [
      { label: "Cases", value: "28", color: "border-t-blue-500" },
      { label: "Confirmed Fraud", value: "8", color: "border-t-red-500" },
      { label: "Under Review", value: "12", color: "border-t-amber-500" },
    ],
    columns: ["ID", "Claim", "Reporter", "Evidence", "Risk", "Status"],
    rows: [
      { "ID": "LIF-101", "Claim": "MacBook Pro", "Reporter": "Suspicious User A", "Evidence": "No trip record", "Risk": "High", "Status": "Blocked" },
      { "ID": "LIF-102", "Claim": "Gold Necklace", "Reporter": "Account XY321", "Evidence": "Conflicting stories", "Risk": "Medium", "Status": "Under Review" },
      { "ID": "LIF-103", "Claim": "Designer Bag", "Reporter": "Account ZZ890", "Evidence": "Repeat offender", "Risk": "High", "Status": "Blocked" },
    ],
    actions: ["Export", "Filter"],
  },
  "accident-reports": {
    title: "Accident Reports",
    description: "Accident tracking, investigation, and resolution.",
    kpis: [
      { label: "Total", value: "64", color: "border-t-blue-500" },
      { label: "This Month", value: "4", color: "border-t-violet-500" },
      { label: "Serious", value: "8", color: "border-t-red-500" },
      { label: "Under Investigation", value: "6", color: "border-t-amber-500" },
    ],
    columns: ["ID", "Trip", "Type", "Severity", "Parties", "Status", "Date"],
    rows: [
      { "ID": "ACC-301", "Trip": "TRP-4750", "Type": "Collision", "Severity": "Serious", "Parties": "Adebayo Ogun, Third party", "Status": "Under Review", "Date": "2026-02-08" },
      { "ID": "ACC-302", "Trip": "TRP-4768", "Type": "Fender Bender", "Severity": "Minor", "Parties": "Ibrahim Musa", "Status": "Resolved", "Date": "2026-02-05" },
      { "ID": "ACC-303", "Trip": "TRP-4801", "Type": "Pedestrian Incident", "Severity": "Serious", "Parties": "Tunde Bakare, Pedestrian", "Status": "In Progress", "Date": "2026-02-10" },
    ],
    actions: ["Export", "Filter"],
  },
  insurance: {
    title: "Insurance Claims",
    description: "Insurance policy management and claims processing.",
    kpis: [
      { label: "Active Policies", value: "3,210", color: "border-t-blue-500" },
      { label: "Claims Filed", value: "142", color: "border-t-violet-500" },
      { label: "Approved", value: "98", color: "border-t-emerald-500" },
      { label: "Pending", value: "28", color: "border-t-amber-500" },
    ],
    columns: ["ID", "Policy", "Claimant", "Amount", "Type", "Status"],
    rows: [
      { "ID": "INS-401", "Policy": "POL-2201", "Claimant": "Adebayo Ogun", "Amount": "₦250,000", "Type": "Vehicle Damage", "Status": "Approved" },
      { "ID": "INS-402", "Policy": "POL-2215", "Claimant": "Ibrahim Musa", "Amount": "₦180,000", "Type": "Third Party", "Status": "Pending" },
      { "ID": "INS-403", "Policy": "POL-2230", "Claimant": "Tunde Bakare", "Amount": "₦420,000", "Type": "Comprehensive", "Status": "Under Review" },
    ],
    actions: ["Export", "Filter"],
  },
  "relief-fund": {
    title: "Relief Fund",
    description: "Relief fund applications and disbursement tracking.",
    kpis: [
      { label: "Fund Balance", value: "₦4.2M", color: "border-t-blue-500" },
      { label: "Applications", value: "84", color: "border-t-violet-500" },
      { label: "Approved", value: "62", color: "border-t-emerald-500" },
      { label: "Disbursed", value: "₦2.8M", color: "border-t-amber-500" },
    ],
    columns: ["ID", "Applicant", "Amount", "Reason", "Status", "Date"],
    rows: [
      { "ID": "RLF-101", "Applicant": "Adebayo Ogun", "Amount": "₦50,000", "Reason": "Medical emergency", "Status": "Approved", "Date": "2026-02-08" },
      { "ID": "RLF-102", "Applicant": "Sani Danjuma", "Amount": "₦75,000", "Reason": "Vehicle repair after accident", "Status": "Pending", "Date": "2026-02-10" },
      { "ID": "RLF-103", "Applicant": "Okonkwo Nnamdi", "Amount": "₦30,000", "Reason": "Family emergency", "Status": "Approved", "Date": "2026-02-06" },
    ],
    actions: ["Export", "Filter"],
  },
  "compliance-logs": {
    title: "Compliance Logs",
    description: "Audit trail and compliance activity records.",
    kpis: [
      { label: "Total Entries", value: "8,420", color: "border-t-blue-500" },
      { label: "This Month", value: "1,842", color: "border-t-violet-500" },
      { label: "Flags", value: "24", color: "border-t-red-500" },
    ],
    columns: ["ID", "Action", "User", "Category", "Result", "Date"],
    rows: [
      { "ID": "CMP-5001", "Action": "Driver verification check", "User": "System", "Category": "Identity", "Result": "Passed", "Date": "2026-02-11" },
      { "ID": "CMP-5002", "Action": "Vehicle inspection audit", "User": "Admin - Kemi", "Category": "Safety", "Result": "Flagged", "Date": "2026-02-10" },
      { "ID": "CMP-5003", "Action": "Payment compliance review", "User": "System", "Category": "Financial", "Result": "Passed", "Date": "2026-02-09" },
      { "ID": "CMP-5004", "Action": "Data privacy check", "User": "Admin - David", "Category": "Data", "Result": "Passed", "Date": "2026-02-08" },
    ],
    actions: ["Export", "Filter"],
  },
  "store-compliance": {
    title: "Store Compliance",
    description: "App store compliance and platform requirements.",
    kpis: [
      { label: "Platforms", value: "3", color: "border-t-blue-500" },
      { label: "Last Audit", value: "Feb 8", color: "border-t-violet-500" },
      { label: "Issues Found", value: "2", color: "border-t-amber-500" },
    ],
    columns: ["Platform", "Version", "Requirement", "Status", "Last Check"],
    rows: [
      { "Platform": "iOS App Store", "Version": "2.4.1", "Requirement": "Privacy manifest", "Status": "Completed", "Last Check": "2026-02-08" },
      { "Platform": "Google Play", "Version": "2.4.1", "Requirement": "Data safety form", "Status": "Active", "Last Check": "2026-02-08" },
      { "Platform": "Huawei AppGallery", "Version": "2.4.0", "Requirement": "Content rating", "Status": "Pending", "Last Check": "2026-02-05" },
    ],
    actions: ["Export", "Filter"],
  },
  reports: {
    title: "Operational Reports",
    description: "Report generation, scheduling, and distribution.",
    kpis: [
      { label: "Reports Generated", value: "842", color: "border-t-blue-500" },
      { label: "This Month", value: "124", color: "border-t-violet-500" },
      { label: "Scheduled", value: "18", color: "border-t-emerald-500" },
    ],
    columns: ["Name", "Type", "Period", "Generated By", "Date", "Status"],
    rows: [
      { "Name": "Monthly Revenue Report", "Type": "Financial", "Period": "Jan 2026", "Generated By": "Admin - Kemi", "Date": "2026-02-01", "Status": "Completed" },
      { "Name": "Driver Performance Summary", "Type": "Operations", "Period": "Jan 2026", "Generated By": "System", "Date": "2026-02-02", "Status": "Completed" },
      { "Name": "Safety Incident Report", "Type": "Safety", "Period": "Q4 2025", "Generated By": "Admin - David", "Date": "2026-01-15", "Status": "Completed" },
      { "Name": "User Growth Analysis", "Type": "Growth", "Period": "Feb 2026", "Generated By": "System", "Date": "2026-02-11", "Status": "Active" },
    ],
    actions: ["Export", "Filter"],
  },
  growth: {
    title: "Growth Dashboard",
    description: "Growth metrics, trends, and performance indicators.",
    kpis: [
      { label: "Monthly Growth", value: "12.4%", color: "border-t-blue-500" },
      { label: "New Users", value: "2,841", color: "border-t-emerald-500" },
      { label: "Retention Rate", value: "78.2%", color: "border-t-violet-500" },
      { label: "Churn", value: "4.8%", color: "border-t-red-500" },
    ],
    columns: ["Month", "New Riders", "New Drivers", "Active Users", "Trips", "Revenue"],
    rows: [
      { "Month": "Jan 2026", "New Riders": "1,842", "New Drivers": "312", "Active Users": "8,420", "Trips": "12,340", "Revenue": "₦18.2M" },
      { "Month": "Dec 2025", "New Riders": "1,620", "New Drivers": "285", "Active Users": "7,890", "Trips": "11,200", "Revenue": "₦16.8M" },
      { "Month": "Nov 2025", "New Riders": "1,480", "New Drivers": "248", "Active Users": "7,210", "Trips": "10,800", "Revenue": "₦15.4M" },
    ],
    actions: ["Export", "Filter"],
  },
  "user-growth": {
    title: "User Growth Analytics",
    description: "User acquisition, retention, and growth tracking.",
    kpis: [
      { label: "Total Users", value: "22,481", color: "border-t-blue-500" },
      { label: "This Month", value: "2,154", color: "border-t-emerald-500" },
      { label: "Rider Growth", value: "+14.2%", color: "border-t-violet-500" },
      { label: "Driver Growth", value: "+8.6%", color: "border-t-amber-500" },
    ],
    columns: ["Period", "New Riders", "New Drivers", "Retention", "Source"],
    rows: [
      { "Period": "Week 6, 2026", "New Riders": "482", "New Drivers": "68", "Retention": "82%", "Source": "Organic" },
      { "Period": "Week 5, 2026", "New Riders": "520", "New Drivers": "74", "Retention": "79%", "Source": "Referral" },
      { "Period": "Week 4, 2026", "New Riders": "398", "New Drivers": "52", "Retention": "76%", "Source": "Campaign" },
      { "Period": "Week 3, 2026", "New Riders": "445", "New Drivers": "61", "Retention": "81%", "Source": "Organic" },
    ],
    actions: ["Export", "Filter"],
  },
  incentives: {
    title: "Incentive Programs",
    description: "Incentive program management and redemption tracking.",
    kpis: [
      { label: "Active Programs", value: "8", color: "border-t-blue-500" },
      { label: "Budget Used", value: "₦4.2M", color: "border-t-amber-500" },
      { label: "Redemptions", value: "3,842", color: "border-t-emerald-500" },
    ],
    columns: ["Name", "Type", "Target", "Budget", "Redeemed", "Status"],
    rows: [
      { "Name": "Weekend Warrior", "Type": "Driver Bonus", "Target": "Drivers", "Budget": "₦1,200,000", "Redeemed": "₦840,000", "Status": "Active" },
      { "Name": "First Ride Free", "Type": "Rider Promo", "Target": "New Riders", "Budget": "₦800,000", "Redeemed": "₦620,000", "Status": "Active" },
      { "Name": "Referral Bonus", "Type": "Referral", "Target": "All Users", "Budget": "₦2,000,000", "Redeemed": "₦1,450,000", "Status": "Active" },
      { "Name": "Peak Hour Surge", "Type": "Driver Bonus", "Target": "Drivers", "Budget": "₦500,000", "Redeemed": "₦320,000", "Status": "Pending" },
    ],
    actions: ["Export", "Filter"],
  },
  acquisition: {
    title: "User Acquisition",
    description: "Campaign management and user acquisition analytics.",
    kpis: [
      { label: "Campaigns", value: "12", color: "border-t-blue-500" },
      { label: "Total Spend", value: "₦8.4M", color: "border-t-amber-500" },
      { label: "Signups", value: "4,821", color: "border-t-emerald-500" },
      { label: "CPA", value: "₦1,742", color: "border-t-violet-500" },
    ],
    columns: ["Campaign", "Channel", "Budget", "Signups", "CPA", "Status"],
    rows: [
      { "Campaign": "Lagos Launch", "Channel": "Social Media", "Budget": "₦2,500,000", "Signups": "1,842", "CPA": "₦1,357", "Status": "Completed" },
      { "Campaign": "Abuja Expansion", "Channel": "Radio + Digital", "Budget": "₦1,800,000", "Signups": "920", "CPA": "₦1,957", "Status": "Active" },
      { "Campaign": "Student Promo", "Channel": "Campus Events", "Budget": "₦600,000", "Signups": "480", "CPA": "₦1,250", "Status": "Active" },
      { "Campaign": "Corporate Partnership", "Channel": "B2B", "Budget": "₦3,000,000", "Signups": "1,200", "CPA": "₦2,500", "Status": "Pending" },
    ],
    actions: ["Export", "Filter"],
  },
  countries: {
    title: "Country Management",
    description: "Multi-country operations and regional management.",
    kpis: [
      { label: "Countries Active", value: "3", color: "border-t-blue-500" },
      { label: "Total Drivers", value: "3,412", color: "border-t-emerald-500" },
      { label: "Total Riders", value: "18,420", color: "border-t-violet-500" },
    ],
    columns: ["Country", "Currency", "Drivers", "Riders", "Status", "Launch Date"],
    rows: [
      { "Country": "Nigeria", "Currency": "NGN (₦)", "Drivers": "3,210", "Riders": "17,840", "Status": "Active", "Launch Date": "2025-03-01" },
      { "Country": "Ghana", "Currency": "GHS (₵)", "Drivers": "142", "Riders": "420", "Status": "Active", "Launch Date": "2025-11-15" },
      { "Country": "Kenya", "Currency": "KES (KSh)", "Drivers": "60", "Riders": "160", "Status": "Pending", "Launch Date": "2026-04-01" },
    ],
    actions: ["Export", "Filter"],
  },
  contracts: {
    title: "Enterprise Contracts",
    description: "Contract management and enterprise partnerships.",
    kpis: [
      { label: "Active Contracts", value: "18", color: "border-t-blue-500" },
      { label: "Total Value", value: "₦142M", color: "border-t-emerald-500" },
      { label: "Expiring Soon", value: "3", color: "border-t-amber-500" },
    ],
    columns: ["Company", "Type", "Value", "Start", "End", "Status"],
    rows: [
      { "Company": "Dangote Industries", "Type": "Enterprise", "Value": "₦24,000,000", "Start": "2025-06-01", "End": "2026-05-31", "Status": "Active" },
      { "Company": "Shell Nigeria", "Type": "Corporate", "Value": "₦18,000,000", "Start": "2025-09-01", "End": "2026-08-31", "Status": "Active" },
      { "Company": "Chevron Nigeria", "Type": "Enterprise", "Value": "₦32,000,000", "Start": "2025-04-01", "End": "2026-03-31", "Status": "Active" },
      { "Company": "Total Energies", "Type": "Corporate", "Value": "₦15,000,000", "Start": "2025-12-01", "End": "2026-02-28", "Status": "Pending" },
    ],
    actions: ["Export", "Filter"],
  },
  overrides: {
    title: "System Overrides",
    description: "Configuration overrides and system settings.",
    kpis: [
      { label: "Active Overrides", value: "14", color: "border-t-blue-500" },
      { label: "Recent Changes", value: "5", color: "border-t-amber-500" },
    ],
    columns: ["Setting", "Default Value", "Override Value", "Set By", "Date"],
    rows: [
      { "Setting": "Max Surge Multiplier", "Default Value": "3.0x", "Override Value": "2.5x", "Set By": "Admin - Kemi", "Date": "2026-02-05" },
      { "Setting": "Driver Timeout (sec)", "Default Value": "30", "Override Value": "45", "Set By": "Admin - David", "Date": "2026-02-08" },
      { "Setting": "Min Driver Rating", "Default Value": "4.0", "Override Value": "3.8", "Set By": "System", "Date": "2026-01-20" },
      { "Setting": "Cash Payment Limit", "Default Value": "₦10,000", "Override Value": "₦15,000", "Set By": "Admin - Kemi", "Date": "2026-02-10" },
    ],
    actions: ["Export", "Filter"],
  },
  "zibra-insights": {
    title: "ZIBRA Insights",
    description: "AI analytics, conversation insights, and resolution metrics.",
    kpis: [
      { label: "Conversations", value: "8,421", color: "border-t-blue-500" },
      { label: "Resolution Rate", value: "89.4%", color: "border-t-emerald-500" },
      { label: "Avg Response Time", value: "1.2s", color: "border-t-violet-500" },
      { label: "Satisfaction", value: "4.6/5", color: "border-t-amber-500" },
    ],
    columns: ["Topic", "Queries", "Resolved", "Avg Time", "Satisfaction"],
    rows: [
      { "Topic": "Trip Issues", "Queries": "2,840", "Resolved": "2,520", "Avg Time": "1.4s", "Satisfaction": "4.5" },
      { "Topic": "Payment Help", "Queries": "1,920", "Resolved": "1,780", "Avg Time": "1.1s", "Satisfaction": "4.7" },
      { "Topic": "Account Support", "Queries": "1,440", "Resolved": "1,280", "Avg Time": "1.3s", "Satisfaction": "4.6" },
      { "Topic": "Safety Questions", "Queries": "842", "Resolved": "790", "Avg Time": "0.9s", "Satisfaction": "4.8" },
    ],
    actions: ["Export", "Filter"],
  },
  "welcome-insights": {
    title: "Welcome Flow Analytics",
    description: "Onboarding metrics and user welcome flow analysis.",
    kpis: [
      { label: "Completions", value: "4,218", color: "border-t-blue-500" },
      { label: "Drop-off Rate", value: "18.4%", color: "border-t-red-500" },
      { label: "Avg Time", value: "3.2 min", color: "border-t-emerald-500" },
    ],
    columns: ["Step", "Views", "Completions", "Drop-off", "Avg Duration"],
    rows: [
      { "Step": "Welcome Screen", "Views": "5,180", "Completions": "5,042", "Drop-off": "2.7%", "Avg Duration": "8s" },
      { "Step": "Phone Verification", "Views": "5,042", "Completions": "4,680", "Drop-off": "7.2%", "Avg Duration": "45s" },
      { "Step": "Profile Setup", "Views": "4,680", "Completions": "4,420", "Drop-off": "5.6%", "Avg Duration": "62s" },
      { "Step": "Payment Method", "Views": "4,420", "Completions": "4,218", "Drop-off": "4.6%", "Avg Duration": "38s" },
    ],
    actions: ["Export", "Filter"],
  },
  "zibra-governance": {
    title: "ZIBRA Governance",
    description: "AI governance settings, rules, and escalation policies.",
    kpis: [
      { label: "Rules Active", value: "42", color: "border-t-blue-500" },
      { label: "Escalations", value: "128", color: "border-t-amber-500" },
      { label: "Auto-resolutions", value: "6,842", color: "border-t-emerald-500" },
    ],
    columns: ["Rule", "Type", "Trigger", "Actions", "Status"],
    rows: [
      { "Rule": "Profanity Filter", "Type": "Content", "Trigger": "Offensive language detected", "Actions": "Block + Warn", "Status": "Active" },
      { "Rule": "Escalation Threshold", "Type": "Safety", "Trigger": "3 failed resolutions", "Actions": "Route to human agent", "Status": "Active" },
      { "Rule": "PII Protection", "Type": "Privacy", "Trigger": "Personal data in chat", "Actions": "Redact + Log", "Status": "Active" },
      { "Rule": "Sentiment Alert", "Type": "Quality", "Trigger": "Negative sentiment score < 0.3", "Actions": "Flag for review", "Status": "Pending" },
    ],
    actions: ["Export", "Filter"],
  },
  "director-settings": {
    title: "Director Configuration",
    description: "Director settings, commission rates, and configurations.",
    kpis: [
      { label: "Active Directors", value: "18", color: "border-t-blue-500" },
      { label: "Commission Rate", value: "5%", color: "border-t-emerald-500" },
      { label: "Avg Performance", value: "82.4", color: "border-t-violet-500" },
    ],
    columns: ["Setting", "Value", "Last Updated", "Updated By"],
    rows: [
      { "Setting": "Base Commission Rate", "Value": "5%", "Last Updated": "2026-01-15", "Updated By": "Super Admin" },
      { "Setting": "Min Drivers to Qualify", "Value": "10", "Last Updated": "2026-01-20", "Updated By": "Admin - Kemi" },
      { "Setting": "Performance Review Cycle", "Value": "Monthly", "Last Updated": "2025-12-01", "Updated By": "Super Admin" },
      { "Setting": "Max Funded per Driver", "Value": "₦100,000", "Last Updated": "2026-02-01", "Updated By": "Admin - David" },
    ],
    actions: ["Export", "Filter"],
  },
  "director-performance": {
    title: "Director Performance",
    description: "Performance metrics, DPS scores, and director rankings.",
    kpis: [
      { label: "Avg DPS", value: "78.4", color: "border-t-blue-500" },
      { label: "Top Performer", value: "92.1", color: "border-t-emerald-500" },
      { label: "Below Threshold", value: "3", color: "border-t-red-500" },
    ],
    columns: ["Director", "DPS Score", "Drivers Managed", "Revenue", "Tier", "Status"],
    rows: [
      { "Director": "Chief Okafor", "DPS Score": "92.1", "Drivers Managed": "45", "Revenue": "₦2,400,000", "Tier": "Gold", "Status": "Active" },
      { "Director": "Alhaji Suleiman", "DPS Score": "84.6", "Drivers Managed": "32", "Revenue": "₦1,800,000", "Tier": "Silver", "Status": "Active" },
      { "Director": "Mrs. Adeyemi", "DPS Score": "78.2", "Drivers Managed": "28", "Revenue": "₦1,200,000", "Tier": "Silver", "Status": "Active" },
      { "Director": "Engr. Nwosu", "DPS Score": "62.4", "Drivers Managed": "15", "Revenue": "₦480,000", "Tier": "Bronze", "Status": "Pending" },
    ],
    actions: ["Export", "Filter"],
  },
};

const greenStatuses = ["Active", "Approved", "Completed", "Resolved", "Returned"];
const amberStatuses = ["Pending", "In Progress", "Under Review", "Upcoming"];
const redStatuses = ["Cancelled", "Rejected", "Failed", "Blocked", "Critical"];

function renderStatusBadge(value: string) {
  if (greenStatuses.includes(value)) {
    return (
      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        {value}
      </Badge>
    );
  }
  if (amberStatuses.includes(value)) {
    return (
      <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
        {value}
      </Badge>
    );
  }
  if (redStatuses.includes(value)) {
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        {value}
      </Badge>
    );
  }
  return <Badge variant="secondary">{value}</Badge>;
}

interface Props {
  section: string;
  parentGroup: string;
  parentRoute: string;
}

export default function AdminSectionContent({ section, parentGroup, parentRoute }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const meta = sectionMeta[section];

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

  const filteredRows = searchQuery.trim()
    ? meta.rows.filter((row) =>
        Object.values(row).some((val) =>
          val.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : meta.rows;

  const kpiColors = [
    "border-t-blue-500",
    "border-t-emerald-500",
    "border-t-violet-500",
    "border-t-amber-500",
  ];

  return (
    <div className="admin-fade-in space-y-8">
      <Link href={parentRoute}>
        <Button variant="ghost" size="sm" data-testid="button-back-to-parent">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to {parentGroup}
        </Button>
      </Link>

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
                {kpi.value}
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
                {filteredRows.length > 0 ? (
                  filteredRows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      data-testid={`table-row-${i}`}
                    >
                      {meta.columns.map((col) => (
                        <td
                          key={col}
                          className="py-3 px-4 text-slate-700 dark:text-slate-300"
                        >
                          {col === "Status"
                            ? renderStatusBadge(row[col] || "—")
                            : row[col] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={meta.columns.length}
                      className="py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                      data-testid="text-no-results"
                    >
                      No results found for &quot;{searchQuery}&quot;
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