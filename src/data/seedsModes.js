// ─── Mode metadata for Seeds of Movement ───
// Plain-language framing lives here; the dense theory-heavy instructions
// the model actually receives stay in systemPrompts.js.

import {
  STORY_MODE_PROMPT,
  ABSTRACT_MODE_PROMPT,
  VOCABULARY_EXPANDER_PROMPT,
} from './systemPrompts'

export const MODES = [
  {
    key: 'story',
    label: 'Story Mode',
    blurb: 'For when you want a piece built like a narrative or an event — a task, an image, a durational structure a performer can enter and interpret in the moment, rather than fixed counts and steps.',
    theory: "Draws on Anna Halprin's life/art scores, Fluxus event scores, and Judson Dance Theater's task-based improvisation — traditions built around open instructions performers complete in their own way.",
    examples: [
      'A solo about waiting for something that never arrives',
      'An event score for two dancers who keep almost touching',
    ],
    prompt: STORY_MODE_PROMPT,
  },
  {
    key: 'abstract',
    label: 'Abstract Mode',
    blurb: 'For precise, technical movement cues — effort qualities, spatial pathways, and phrase structures you can drop straight into rehearsal when you need something exact rather than evocative.',
    theory: "Grounded in Laban Movement Analysis, Forsythe's Improvisation Technologies, and Viewpoints — frameworks that give abstract movement nameable, repeatable qualities.",
    examples: [
      'Cues built from sudden time and diagonal pathways',
      'A phrase exploring bound vs. free flow',
    ],
    prompt: ABSTRACT_MODE_PROMPT,
  },
  {
    key: 'vocabulary',
    label: 'Movement Vocabulary Expander',
    blurb: 'For breaking out of movement habits — describe a pattern you keep defaulting to, and get targeted exercises designed to interrupt it and open up new physical territory.',
    theory: 'Draws on Bartenieff Fundamentals, Body-Mind Centering, Skinner Releasing Technique, and Contact Improvisation — somatic traditions focused on retraining habitual patterns.',
    examples: [
      'I always default to fluid, continuous movement',
      'I never leave middle level — I stay standing',
    ],
    prompt: VOCABULARY_EXPANDER_PROMPT,
  },
]
