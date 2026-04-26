# Final Fixes — Make Everything Actually Work

## Critical Broken Things (fix first)

### 1. Upload Portfolio — [object Object] error
- The API expects `fund_name` but might return validation errors as objects
- Fix: properly parse error responses, show human-readable messages

### 2. Strategy Builder — no way to enter constraint/objective values  
- Constraint dialog adds a row but fields are empty/non-editable
- Need: when "Factor Exposure Constraint" selected, show factor dropdown + lower/upper bound inputs
- Each constraint type needs its own form fields

### 3. Additional Analytics modal — overflow + selections not visible
- Modal too tall, Done button hidden below viewport
- Fix: add max-height + overflow-y-auto to dialog content
- Show selected factors as badges below the button bar on the main page

### 4. Performance Summary tabs — layout shift
- Tab moves right when non-first option selected
- Root cause: Tabs component re-renders with different widths
- Fix: use fixed-width buttons or Links instead of Tabs

### 5. CardControls — all say "coming soon"
- Download: actually download the visible table/chart data as CSV
- Info: show actual description of what the chart shows
- Filter: filter the data (or genuinely hide if not applicable)
- Expand: open in fullscreen modal

### 6. Download/Refresh buttons throughout
- "Download Raw Data" should download the current page's data
- "Refresh" should re-fetch data from API

## Execution Plan
1. Fix Upload Portfolio error parsing
2. Fix Strategy Builder constraint forms
3. Fix Additional Analytics overflow + persist selections
4. Fix Performance Summary tab navigation
5. Make CardControls functional (download at minimum)
6. Wire all Refresh buttons
7. Add "How to Use" guide component on every page
