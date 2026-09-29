# BNMPC Science Carnival Website — Edit Guide

Every editable area is separated with numbered headings and comments.

## File map

| File | What to edit |
|---|---|
| `dist/index.html` | Homepage logo, navigation, date, venue and club details |
| `dist/event-data.js` | Segment titles, eligibility, member limits, descriptions and rules |
| `dist/events.html` | Events page heading and general page layout |
| `dist/schedule.html` | Day 1, Day 2 and Day 3 schedule rows |
| `dist/gallery-data.js` | Gallery photo paths, captions and day numbers |
| `dist/gallery.html` | Gallery heading and empty state |
| `dist/contact.html` | Three contact names, designations and phone numbers |
| `dist/config.js` | Google Apps Script registration URL |
| `dist/script.js` | Registration behavior, popups, filters, countdown and navigation |
| `dist/styles.css` | All visual design and responsive rules |
| `backend/Code.gs` | Google Sheets tabs, stored columns and confirmation email |
| `GOOGLE-SHEETS-SETUP.md` | Step-by-step backend connection instructions |

## Homepage assets

Upload these exact filenames inside `dist/assets/`:

- `homepage-background.jpg` — homepage background
- `header-logo.png` — circular logo in the navigation bar
- `loading-logo.png` — cinematic loading logo
- `event-logo.png` — large homepage event logo

No HTML or CSS change is required when these exact filenames are used.

## Event rules and registration limits

Open `dist/event-data.js`. Every segment has its own clearly separated object.

Important values:

- `groups` — allowed event group selection; open-for-all events do not show it
- `minMembers` and `maxMembers` — controls the Select Your Team Size options
- `teamName: true` — adds Team Name
- `entryNameLabel` — adds Project, Wall Magazine, Scrapbook or Topic name
- `sameInstitution: true` — checks that all members use the same institution
- `rules` — rules shown inside See Details

## Gallery photos

1. Create `dist/assets/gallery/`.
2. Upload the photos there.
3. Add each photo to `dist/gallery-data.js`:

```js
{ src: "assets/gallery/day-1-opening.jpg", alt: "Opening ceremony", day: "1" }
```

## Google Sheets and confirmation email

Follow `GOOGLE-SHEETS-SETUP.md`. Keep `demoMode: true` in `dist/config.js` until the Apps Script Web App URL is ready.
