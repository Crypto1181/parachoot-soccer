# Apple App Store Appeal Letter
## Guideline 5.2.3 — Legal (Third-Party Content Rights)
**Submission ID:** ab7f0e77-38f4-4de9-9703-37a1e5e894b9

---

> **HOW TO SUBMIT:** Go to App Store Connect → Your App → App Review → Reply to the review message. Paste this letter into the message box and attach your RapidAPI invoice as a PDF attachment.

---

Dear Apple App Review Team,

Thank you for reviewing **Parachoot Soccer** (App Apple ID: 6758711705) and for the opportunity to address your concerns regarding Guideline 5.2.3.

We appreciate your diligence in protecting intellectual property rights on the App Store. We would like to provide a full and transparent explanation of how our application works, along with documentary evidence demonstrating that we operate within all applicable legal frameworks.

---

## 1. What Parachoot Soccer Is

Parachoot Soccer is a **sports information and content aggregation platform**. It functions similarly to a specialized sports web browser — it discovers, indexes, and presents links to publicly accessible content that is already freely available on the open internet. It does **not** create, host, store, cache, re-transmit, or rebroadcast any audio or video content whatsoever.

---

## 2. How the "TV Live" Feature Works (Technical Architecture)

The "TV Live" section is powered by the **WeStream public API** (`westream.su`), which is a **free, open, publicly accessible API** that indexes sports event embed links. This API is freely available to any developer and does not require licensing, credentials, or subscription fees.

**The technical flow is as follows:**

1. Our app calls the WeStream public API (`GET /matches/live`) to retrieve a list of currently live football matches.
2. For each match, the API returns publicly available embed URL references (iframe sources).
3. Our app renders these embed URLs inside a **standard WebView/iframe component** — identical to how a Safari or Chrome browser would render any publicly accessible web page.
4. **We do not proxy, transcode, re-stream, store, or modify any video data.** The video content is served entirely and directly by the original source server to the user's device — our app is simply a browser frame.

This is architecturally identical to how apps like **Flipboard** (articles), **Feedly** (RSS), or **Plex** (media indexing) aggregate and display publicly available content — they are browsers and aggregators, not content hosts.

---

## 3. Match Statistics & Discovery Data

All match statistics, scores, team information, and competition data are sourced via a **licensed commercial API subscription** from **RapidAPI / FlashScore**. We hold an active paid subscription for this service.

**Evidence:** We have attached our most recent RapidAPI/FlashScore invoice as documentary proof of our licensed data access.

---

## 4. We Do Not Violate Third-Party Rights — Here Is Why

| Concern | Our Position |
|---------|-------------|
| Do you host video content? | **No.** We serve zero bytes of video from our own servers. |
| Do you re-stream or proxy streams? | **No.** All content is loaded directly from its original source into a standard WebView. |
| Do you have rights to the stream data? | The WeStream API is a **free, public API** that indexes publicly available embed links, identical to what any user could find by searching the web. |
| Do you have rights to match data? | **Yes.** We hold a licensed commercial subscription to RapidAPI/FlashScore (invoice attached). |
| Can you be held responsible for third-party content? | We operate a full **DMCA takedown policy** displayed prominently within the app. Any rights holder can contact us at **parachootsoccer@gmail.com** for immediate removal of any content. |

---

## 5. In-App Legal Disclosures

We have added a prominent "Legal & Content Notice" dedicated page **accessible from the main side-menu (slider) on the Home page**, clearly informing users that:

- Parachoot Soccer is a content aggregator and browser, not a content host.
- All streams are sourced from publicly available third-party sources.
- Availability of content is subject to the original broadcaster's terms.
- Users are responsible for ensuring their use complies with local laws.
- A DMCA contact channel is provided for rights holders.

---

## 6. Comparable Apps Already on the App Store

We respectfully note that numerous apps currently available on the App Store operate under a similar aggregation model, including sports score and highlights apps, podcast aggregators, and news reader applications — all of which display third-party content within in-app browsers without being considered rights violators.

---

## 7. Our Commitment

We are fully committed to operating within Apple's guidelines and all applicable laws. We have taken the following proactive steps:

- ✅ Added an explicit "Legal & Content Notice" page accessible from the main side-menu (slider) on the Home screen.
- ✅ Added a DMCA & Takedown contact within the app.
- ✅ Displayed clear messaging that we are a browser/aggregator, not a content host.
- ✅ Attached our RapidAPI/FlashScore commercial subscription invoice as proof of licensed data access.

We sincerely believe that Parachoot Soccer does not violate Guideline 5.2.3, and we respectfully request that you reconsider the app for approval based on the above explanation and evidence.

If you have any further questions or require additional documentation, please do not hesitate to reach out. We are happy to provide a screen recording, a technical architecture diagram, or any other information that would assist your review.

Thank you for your time and consideration.

Sincerely,

**Clinton Eze**
Developer — Parachoot Soccer
📧 parachootsoccer@gmail.com
🌐 App Apple ID: 6758711705

---

> **ATTACHMENT CHECKLIST before submitting:**
> - [ ] RapidAPI / FlashScore invoice PDF (your most recent bill)
> - [ ] Optional: Screenshot of WeStream.su website showing it is a free public API
> - [ ] Optional: Screenshot of the new in-app legal disclaimers on the Live TV page
