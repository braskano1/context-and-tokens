# Product

## Register

product

## Users

Thai office workers, writers, PMs, and ops staff who use Claude or ChatGPT on a
subscription. No technical background and no API experience. They meet this page on their own
laptops during a live workshop, alongside a presenter, and explore it unguided while someone talks.
Some will open it again later on a phone.

Their job: understand why a long chat forgets things, why it slows down, why it burns their usage
limit, and what to do differently tomorrow morning.

## Product Purpose

An interactive explainer that makes tokens and the context window tangible by letting people
manipulate them. Four demos, each answering one question a real subscriber has asked out loud:
what is a token, what is the window, why does it get slow and expensive, and why does it miss
things buried in long documents.

Success is behavioural, not informational: an attendee starts a new chat when the topic changes,
puts their question first, and stops re-pasting the same document. The page is judged on whether it
changes what they do, not on whether they can define a token.

## Brand Personality

Playful, alive, and calm. Something you want to keep clicking — the buttons invite a second and
third press, and the charts reward watching. Never frantic. It has a pulse and a rhythm rather than
a sequence of static screens, but it never animates for its own sake.

Voice: plain spoken Thai, the way a patient colleague explains something over a desk. English
technical terms appear once in parentheses at first mention, then never again. No jargon, no
translationese, no hedging, no corporate cheer.

Above all, honest. Every number on screen is computed from real data or explicitly labelled as
approximate with its source. Nothing is presented as a live model result when it is not. A sharp
attendee who challenges any claim should find the page already agrees with them.

## Anti-references

- **Corporate slide decks.** Logo bar, bullet lists, a title and three points per screen, forgotten
  the moment it ends.
- **Generic SaaS marketing pages.** Purple gradients, identical feature cards, meaningless hero
  metrics, glassmorphism, tracked uppercase eyebrows above every section.
- **Academic papers and lecture slides.** Technical vocabulary, dense unlabelled charts, an air of
  being examined rather than helped.
- **Toys.** Loud colours, cartoon styling, motion that plays for its own sake. Playful means
  invites a second click, not childish.

## Design Principles

1. **Practice what you preach.** A page about wasting attention must not waste the reader's.
   Every element earns its space; nothing decorates.
2. **Show, don't assert.** No claim appears without something on screen that demonstrates it. If a
   rule cannot be traced to a demo the attendee can run, the rule is cut or reworded.
3. **Manipulable, not narrated.** Understanding comes from clicking, pasting, and watching a bar
   move. Text exists to frame what the reader just did.
4. **Honest under challenge.** Approximations are labelled with their source and error. Recorded
   results say so. The page never overstates an effect to make a better story.
5. **Degrade to plain and readable.** Every enhancement — motion, snapping, the tokenizer itself —
   is layered over a state that already works. A failure loses polish, never content.

## Accessibility & Inclusion

- Text contrast at least WCAG AA: 4.5:1 for body, 3:1 for large text. Verified, not assumed.
- `prefers-reduced-motion: reduce` disables every animation on the page, including chart reveals,
  slide entrances, and the demo 3 playback. All content remains reachable and complete.
- Thai script needs generous line-height for tone marks and vowels above and below the line.
- Room conditions matter: read from the back row on a projector, and on a phone at arm's length.
- Colour never carries meaning alone — anything encoded in colour is also stated in text.
- Keyboard reachable throughout; the page is plain semantic DOM with no custom widgets.
