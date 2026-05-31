# 🔥 NutriTrack

A full-stack nutrition tracking web app inspired by MyFitnessPal and MacroFactor. Built with React, Supabase, and the USDA food database.

**Live app:** https://nutritrack-five-pied.vercel.app

---

## What it does

NutriTrack lets users track their daily calories, macros, and body weight with a clean, mobile-friendly interface. It includes a smart calorie adjustment algorithm that estimates your real calorie burn based on your actual weight trend — similar to how MacroFactor works.

## Features

- **User authentication** — sign up and log in with email/password, powered by Supabase Auth
- **Personalized calorie targets** — calculated using the Mifflin-St Jeor formula based on age, sex, height, weight, activity level, and goal
- **Food search and logging** — search from the USDA FoodData Central database (300,000+ foods), adjust serving size, and log to your daily diary
- **Macro tracking** — protein, carbs, and fat tracked against personalized targets with progress bars
- **Body weight logging** — log daily weight with a trend chart over time
- **Progress charts** — 7-day calorie bar chart and today's macro breakdown as a donut chart
- **Adaptive TDEE algorithm** — after enough data, the app estimates your real total daily energy expenditure from your actual weight trend vs. calories consumed, and gives personalized recommendations
- **Cloud sync** — all data stored in Supabase with row-level security so each user only sees their own data

## Tech stack

- **React** — component-based UI
- **Vite** — build tool and local dev server
- **Supabase** — user authentication and PostgreSQL database with row-level security
- **USDA FoodData Central API** — food search database
- **Recharts** — data visualizations
- **Lucide React** — icons
- **Vercel** — deployment

## Running locally

1. Clone the repo
2. Install dependencies
3. Create a `.env` file in the root with your own keys
4. Start the dev server

## Database setup

Run this SQL in your Supabase SQL editor to create the required tables and security policies — see the schema in the project notes.

---

Built by Arjun Pangarkar