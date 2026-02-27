Skip to content
agrgarima-dot
Finzzup--portal-v4
Repository navigation
Code
Issues
Pull requests
Actions
Projects
Wiki
Security
Insights
Settings
Finzzup--portal-v4/src
/
App.jsx
in
main

Edit

Preview
Indent mode

Spaces
Indent size

2
Line wrap mode

No wrap
Editing App.jsx file contents
  1
  2
  3
  4
  5
  6
  7
  8
  9
 10
 11
 12
 13
 14
 15
 16
 17
 18
 19
 20
 21
 22
 23
 24
 25
 26
 27
 28
 29
 30
 31
 32
 33
 34
 35
 36
import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Legend,
  Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

// ─── TOKENS ──────────────────────────────────────────────────────────────────
const C = {
  bg:      "#F7F8FC",
  bg2:     "#FFFFFF",
  bg3:     "#EEF1F8",
  border:  "#E2E7F0",
  text:    "#0F1A38",
  muted:   "#6B7DB3",
  dim:     "#A0AECF",
  blue:    "#3B6FF7",
  purple:  "#7C5CF5",
  teal:    "#0CB8A4",
  pink:    "#E8509A",
  amber:   "#F59E0B",
  green:   "#10B981",
  red:     "#EF4444",
  navy:    "#0A1128",
  grad1:   "linear-gradient(135deg,#3B6FF7,#7C5CF5)",
  grad2:   "linear-gradient(135deg,#0CB8A4,#3B6FF7)",
  grad3:   "linear-gradient(135deg,#E8509A,#7C5CF5)",
  grad4:   "linear-gradient(135deg,#F59E0B,#E8509A)",
};
const F  = "'Plus Jakarta Sans', sans-serif";
const FM = "'DM Mono', monospace";
const WA = "https://wa.me/919833585810";  // Garima's WhatsApp — single source of truth

// ─── INVITE CODES → client data ──────────────────────────────────────────────
// 🔧 When you connect Supabase, replace this with a DB lookup
Use Control + Shift + m to toggle the tab key moving focus. Alternatively, use esc then tab to move to the next interactive element on the page.
 
