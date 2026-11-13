/* ============================================================================
   content.js  —  THE ONLY FILE YOU EVER NEED TO EDIT.
   Everything personal lives here. Nothing in game.js needs to change.
   Keep the quotes and the commas exactly as they are.
   ========================================================================== */

var CONTENT = {

  /* Her name, used throughout the game. */
  name: 'Flor',

  /* The anniversary: the day you started. Month 1-12, day 1-31.
     On that date a golden rose falls once per run, worth a small fortune,
     and the title screen changes.
     With monthly: true it also does it on the 12th of every other month,
     quietly, for the monthversaries. Set it to false to keep it to the one day. */
  anniversary: { month: 12, day: 12, year: 2025, monthly: true },

  /* Shown on the title screen under the name of the game. */
  tagline: 'for Flor',

  /* Shown on the title screen on the day itself. */
  annivLine: 'one year',
  monthLine: 'another month of you',

  /* ---------------------------------------------------------------------------
     FRAGMENTS — the notes hidden inside falling stars.
     One line each. Memories, jokes, references, small true things.
     She catches them one at a time; they collect in the Sketchbook forever.
     Add as many as you like. 5 to 10 is a good number.
     --------------------------------------------------------------------------- */
  fragments: [
    'The first thing I noticed was your smile. It is still contagious.',
    'Leck meine Eier.',
    'BSZ1. Where we met. Where we hid it. Where it began.',
    'We laugh at literally anything, and I love it.',
    'I love it when you are just yourself.',
    'You are right almost all the time. Annoying to admit.',
    'Cooking for you, a comfort show, a walk. That was a dream.',
    'I dream of you often.',
    'I want another vacation with you.',
    'There are five thousand flowers and exactly one of them is mine.',
    'I would have waited longer.',
    'You are the only one of your kind.',
    'Eleven months, and I still look for you in a room.'
  ],


  /* ---------------------------------------------------------------------------
     LETTER ONE — the finale. Read out by the rose when she finishes the journey.
     One array entry per line. Short lines read better; they are typed out slowly.
     Blank strings are pauses.
     --------------------------------------------------------------------------- */
  letter1: [
    'TODO — the letter.',
    '',
    'Every line of this is a separate entry',
    'in letter1 inside content.js.',
    '',
    'Keep the lines short.',
    'They are typed out one at a time,',
    'the way someone talks when they mean it.',
    '',
    'Happy anniversary.'
  ],

  /* Signed at the bottom of the finale, after a pause. */
  signature: '— TODO',

  /* ---------------------------------------------------------------------------
     LETTER TWO — the long one. Unlocked a line at a time by catching star-notes
     in Endless mode, forever. One line per star. Make it as long as you want;
     the game just keeps revealing it.
     --------------------------------------------------------------------------- */
  letter2: [
    'TODO — the long letter, line one.',
    'Each line is unlocked by one star caught in Endless.',
    'So make this one long.',
    'There is no limit.',
    'She can keep finding it for months.'
  ],

  /* ---------------------------------------------------------------------------
     TRINKETS — the things that stay on her planet once caught.
     You can rename any of these to something that means something to you two.
     The drawing stays the same; only the name shown in Her Planet changes.
     --------------------------------------------------------------------------- */
  trinketNames: {
    lamp:    'The lamplighter\'s lamp',
    bench:   'A bench for two',
    scope:   'A telescope',
    jar:     'A star in a jar',
    dome:    'The glass dome',
    sheep:   'A wind-up sheep',
    volcano: 'A volcano, for warmth',
    vane:    'A weather vane',
    boat:    'A paper boat',
    swing:   'A swing',
    cup:     'Two cups',
    cage:    'An empty birdcage'
  },

  /* Small lines the rose says while she plays. Keep them light. */
  roseLines: [
    'You came back.',
    'Mind the thorns.',
    'I was not worried.',
    'Do that again.',
    'More water. Please.',
    'I am the only one of my kind, you know.'
  ]
};
