# Obsidian Detail Studio

A scroll-driven marketing site for a car detailing studio, with an online booking drawer and an owner dashboard.

- `index.html` — the site. One pinned scene: bring it dirty → scroll to wash → look closer → swirls out, glass on → keys back. Booking drawer at the end.
- `admin.html` — owner login and Studio OS (Overview, Leads, Bookings, Calendar, Messages, Customers, Reviews, Automations, Settings).
- Bookings made on the site are stored in `localStorage` and appear in the admin Leads table on the same browser. Any password signs in to the demo admin.

No build step. Serve the folder with any static server:

```
npx serve .
```

Imagery was generated with Higgsfield (GPT Image 2.6) from a single hero shot so the dirty, clean, sunset and macro frames all show the same car.
