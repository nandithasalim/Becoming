"""The onboarding questions: preset choices for each one.

Every question also accepts the user's own typed answer ("Something else..."),
so these lists are suggestions shown as chips, not the only allowed values.
The web app shows the same lists, so keep them in sync with web/questions.js.
"""

# Screen 1 · You, now (required)
CURRENT_FEELING = ["lost", "stuck", "okay", "hopeful"]
SITUATION = ["student", "working", "job_hunting", "at_home"]

# Screen 2 · Future you (required)
ROLE = ["designer", "founder", "doctor", "artist", "engineer", "teacher"]
PLACE = ["a flat in Bangalore", "a quiet house in Kochi", "a new country", "a home by the sea"]
FEEL = ["calm", "free", "proud of myself", "like I belong"]

# Screen 3 · Who they are (required)
TRAITS = ["calm", "disciplined", "bold", "kind", "focused", "confident", "curious", "patient"]
LET_GO = ["overthinking", "scrolling for hours", "procrastinating", "people-pleasing", "self-doubt", "comparing myself"]
VOICE = ["gentle", "coach", "wise"]  # gentle friend / tough coach / calm & wise

# Screen 4 · The dream (optional)
LOVED_AS_KID = ["drawing", "music", "sports", "reading", "building things", "dancing", "teaching others"]
FOCUS_AREAS = ["career", "health", "money", "family_love", "peace", "creativity"]

# Limits
MAX_TEXT = 60          # longest typed answer for a choice
MAX_WOULD_TRY = 200    # the one open question
TRAITS_COUNT = 3
MAX_FOCUS = 3
MAX_LIST = 5
