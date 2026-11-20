// The onboarding questions, grouped in sections. Every question gets its own screen.
// Values must match backend/app/questions.py.
// type: 'text' (short), 'long' (optional paragraph), 'one' (pick 1, shown as cards), 'many' (pick several, shown as chips)
// opts: [value, label, optional short description]
// Every 'one'/'many' question also gets a "Something else…" option unless custom: false.

export const SECTIONS = [
  {
    title: 'You, now',
    sub: "Let's start with where you are today.",
    qs: [
      { k: 'situation', type: 'one', label: "What's your day like right now?", opts: [
        ['student', 'Studying', 'School, college or a course'],
        ['working', 'Working', 'A job, full or part time'],
        ['job_hunting', 'Looking for work', 'Searching for the next thing'],
        ['at_home', 'At home', 'Caring for home or family'],
      ] },
      { k: 'current_feeling', type: 'one', label: 'And how does life feel lately?', opts: [
        ['excited', 'Excited', 'Things are moving'],
        ['hopeful', 'Hopeful', 'Something good is coming'],
        ['figuring_out', 'Figuring it out', 'Not sure of the next step yet'],
        ['ready_for_change', 'Ready for a change', 'I want more than this'],
        ['a_bit_lost', 'A little lost', 'Honestly, it has been hard'],
      ] },
      { k: 'display_name', type: 'text', label: 'What should your future self call you?', placeholder: 'Your name', max: 40 },
    ],
  },
  {
    title: 'Future you',
    kicker: "It's 2031.",   // shown big above every question in this section
    sub: "It's 2031. Picture an ordinary day.",
    qs: [
      { k: 'role', type: 'one', label: 'What do you spend your days on?', opts: [
        ['designer', 'Designing'], ['founder', 'Running my company'], ['doctor', 'Healing people'],
        ['artist', 'Making art'], ['engineer', 'Building tech'], ['teacher', 'Teaching'],
      ] },
      { k: 'place', type: 'one', label: 'Where do you wake up?', opts: [
        ['a flat in Bangalore', 'A flat in Bangalore'], ['a quiet house in Kochi', 'A quiet house in Kochi'],
        ['a new country', 'A new country'], ['a home by the sea', 'A home by the sea'],
      ] },
      { k: 'feel', type: 'one', label: 'How do you feel most days?', opts: [
        ['calm', 'Calm'], ['free', 'Free'], ['proud of myself', 'Proud of myself'], ['like I belong', 'Like I belong'],
      ] },
    ],
  },
  {
    title: 'Who they are',
    kicker: "It's 2031.",   // shown big above every question in this section
    sub: 'The person you are becoming.',
    qs: [
      { k: 'traits', type: 'many', exact: 3, noun: 'trait', label: 'Pick 3 words that describe future you.', opts: [
        ['calm', 'Calm'], ['disciplined', 'Disciplined'], ['bold', 'Bold'], ['kind', 'Kind'], ['focused', 'Focused'],
        ['confident', 'Confident'], ['curious', 'Curious'], ['patient', 'Patient'], ['creative', 'Creative'], ['joyful', 'Joyful'], ['proud', 'Proud'],
      ] },
      { k: 'let_go', type: 'many', min: 1, max: 5, noun: 'thing', label: "What did future you leave behind?", opts: [
        ['overthinking', 'Overthinking'], ['scrolling for hours', 'Scrolling for hours'], ['procrastinating', 'Procrastinating'],
        ['people-pleasing', 'People-pleasing'], ['self-doubt', 'Self-doubt'], ['comparing myself', 'Comparing myself'],
        ['staying up too late', 'Staying up too late'], ['waiting to feel ready', 'Waiting to feel ready'],
      ] },
      { k: 'voice', type: 'one', custom: false, label: 'How should future you talk to you?', opts: [
        ['gentle', 'A gentle friend', 'Warm, patient, always on your side'],
        ['coach', 'A tough coach', 'Direct. Pushes you when you need it'],
        ['wise', 'Calm and wise', 'Few words, the big picture'],
      ] },
    ],
  },
  {
    title: 'The dream',
    sub: 'Optional. It helps your future self know you better.',
    optional: true,
    qs: [
      { k: 'loved_as_kid', type: 'many', max: 5, label: 'What did you love doing as a kid?', opts: [
        ['drawing', 'Drawing'], ['music', 'Music'], ['sports', 'Sports'], ['reading', 'Reading'],
        ['building things', 'Building things'], ['dancing', 'Dancing'], ['teaching others', 'Teaching others'],
      ] },
      { k: 'would_try', type: 'long', label: 'If no one judged you, what would you try?', placeholder: 'Anything, big or small', max: 200 },
      { k: 'focus_areas', type: 'many', max: 3, label: 'What matters most right now?', opts: [
        ['career', 'Career'], ['health', 'Health'], ['money', 'Money'], ['family_love', 'Family and love'],
        ['peace', 'Peace of mind'], ['creativity', 'Creativity'],
      ] },
    ],
  },
];

export const MAX_TEXT = 60;
