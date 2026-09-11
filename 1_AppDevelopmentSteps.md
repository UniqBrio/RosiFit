# How to build an app with this framework

Plain-English steps. Follow them in order.

Everything here is the short version. When you want the detail and the reasons,
[docs/02-PROJECT-INITIALIZATION.md](docs/02-PROJECT-INITIALIZATION.md) is the long version of
Part 1, and [docs/01-SDLC.md](docs/01-SDLC.md) is the long version of Part 2.

**Two folders, and it matters which one you are in.**

- The **framework** folder is this one. It holds the process and the tools.
- The **app** folder is the one you are about to create, somewhere beside it.

Most commands run in the app. A few run in the framework. Each step below says which.

---

## Part 1 — Setting up a new app (once)

### Step 1. Write three sentences first

In the framework folder, or on paper, answer:

- What does this app do?
- Who is it for?
- What does "working" mean?

If you cannot write those three sentences, the requirements are not ready. Scaffolding now will
not help — you will just build the wrong thing faster.

### Step 2. Create the app

**In the framework folder:**

```bash
node scripts/new-app.mjs --name my-app --dir ../my-app
```

This copies the starter code and links the process. "Linked" means your app points at this
framework folder rather than owning a copy — so when the framework improves, your app can pick
it up without you copying files around.

### Step 3. Install and make the first commit

**In the app folder:**

```bash
cd ../my-app
npm install
git init
git add -A
git commit -m "Scaffold"
```

Commit the `package-lock.json` that `npm install` creates. **Your app pins its versions.** (The
framework's starter deliberately does not — that is its job, not yours.)

### Step 4. Set your colours before you build any screens

**In the app folder**, edit `design/tokens.json`, then:

```bash
npm run theme:build
```

All colour lives in that one file. Never type a colour code anywhere else. Doing it now takes a
minute; doing it after you have thirty screens takes a week.

### Step 5. Add your logo and images, for both light and dark

Put them where `design/tokens.json` says. You need both versions. A logo that only works on a
white background is a bug you will find later, from a user.

### Step 6. Create your registers, and write down your environments

A new app has no `docs/registers/` folder yet. Copy the blank ones across —
**from the framework folder:**

```bash
cp -r docs/registers ../my-app/docs/registers
```

These are running notes: decisions you made, bugs you root-caused, limits you hit. They are
worth almost nothing today and a great deal in six months — but only if you write in them as
things happen. You cannot backfill them later.

Then fill in `docs/registers/ENVIRONMENTS.md` first: which database is which, who can write to
it, and which one must **never** be touched by automation.

That one file prevents the worst question in software: *"which database did that test just
write to?"*

### Step 7. Check the safety checks are switched on

There is nothing to install. The scaffolder already put `.claude/settings.json` in your app, and
that file switches the guards on for every Claude Code session automatically.

Just make sure it is committed:

```bash
git ls-files .claude/settings.json
```

If that prints the filename, you are done. If it prints nothing, commit it. Settings that live
on only one machine protect only one machine.

### Step 8. Fill in your app's rules

The scaffolder already created `CLAUDE.md` in your app. Fill in the rules that are specific to
**your** app: how login works, how data is fetched, what must never happen.

For each rule, write down where in the code it is enforced. A rule with no file next to it
cannot be checked, so it will quietly stop being true.

### Step 9. Ship something trivial, all the way

Before building anything real, push one tiny thing through the whole process — plan, build,
test, deploy, check it works.

You will find about three broken things. Finding them now, on something that does not matter, is
the cheapest debugging you will ever do.

---

## Part 2 — Building features (every time)

This is the loop you will repeat for the rest of the project.

### Step 1. Say what you want, in your own words

**In the app folder**, in Claude Code:

```
/request
```

Then describe what you want in plain words. You do not need to know whether it is a feature, a
bug, or a change.

`/request` works out which it is, writes it down properly in `requests/`, and then continues
into the right process automatically — in the same session. You do not run a second command.

### Step 2. Answer the questions it asks

It will stop and ask you things. Answer them. Anything you do not answer is recorded as
`unknown` rather than guessed at — that is deliberate, so nobody later mistakes a guess for
something you decided.

### Step 3. Let it build

It plans, builds, and tests. It will stop at checkpoints for your approval.

### Step 4. Check it before merging

**In the app folder:**

```bash
npm run gate
```

There are three possible answers:

| Result | Meaning |
|---|---|
| **PASS** | Safe to merge |
| **FAIL** | Something is broken. Fix it |
| **BLOCKED** | A check could not run. **This is not a pass.** Find out why |

Do not merge on anything but PASS.

### Step 5. Merge

---

## Part 3 — Keeping up with framework improvements

The framework gets better over time. Your app does not get those improvements automatically —
and that is on purpose, so nothing changes under you mid-task.

**When you want the latest**, first update the framework:

```bash
cd ../Custom-Web-App-Development-Framework
git pull
```

Then, **in the app folder**:

```bash
npm run framework:upgrade
```

It tells you what changed and what, if anything, you need to do. If you are already up to date
it says *"Already current. Nothing to do."* and stops — so running it twice costs nothing.

**Do this between tasks, never in the middle of one.** Pulling new rules into a job already in
progress is how a working app goes red halfway through.

To just check where you stand:

```bash
npm run framework:status
```

---

## Part 4 — When you learn something worth keeping

Sometimes you fix a bug and realise the lesson is bigger than your app. Write it down straight
away, or it will be forgotten by next week and you will pay for it twice.

**In the framework folder:**

```bash
npm run capture -- --rule "A derived value must recompute when any input changes" --app my-app --apply
```

Two rules for writing the rule down:

1. **No business words.** "Invoice totals must recompute" is about your app. "A derived value
   must recompute when any input changes" is about software. Only the second kind is worth
   keeping. The tool checks this and will refuse the first kind.
2. **One sighting is not proof.** It gets parked, and the framework does **not** change.

If a *different* app later hits the same thing:

```bash
npm run capture -- --sighting-of CAND-002 --app other-app --apply
```

Now it has happened twice, in two different apps, so it is probably a real rule. The tool marks
it ready and tells you to run `/promote` and then `/framework-update`.

**The tool never changes the framework itself.** That step stays with a person, on purpose. A
rule added automatically comes with no test behind it, and a rule nothing tests is just a
comment.

---

## Commands you will actually use

**In the app folder:**

| Command | What it does |
|---|---|
| `npm run dev` | Run the app while you work |
| `npm run gate` | The full check. Run before merging |
| `npm run typecheck` | Just the type errors |
| `npm run lint` | Just the code style |
| `npm run test:unit` | Fast tests |
| `npm run test:functional` | Browser tests |
| `npm run theme:build` | Rebuild colours after editing tokens |
| `npm run framework:upgrade` | Pick up framework improvements |
| `npm run framework:status` | Which framework version am I on? |

**In the framework folder:**

| Command | What it does |
|---|---|
| `npm run capture -- --list` | Show parked lessons |
| `npm run gate` | Check the framework itself |
| `npm run guard:test` | Prove every safety check still works |

**In Claude Code, inside the app:**

| Command | When |
|---|---|
| `/request` | **Start here every time.** It picks the right process for you |
| `/gate` | Run the checks and get an honest verdict |
| `/promote` | A lesson looks bigger than this app |
| `/brainstorm` | Thinking out loud. No code, no changes |

You almost never need the others directly — `/request` routes you.

---

## Things that go wrong, and how to avoid them

**Typing a colour code into a component.** Use the tokens. One file, one place, and a rebrand
takes a minute instead of a month.

**Treating BLOCKED as PASS.** BLOCKED means nobody checked. "Nothing found" and "nothing looked"
look identical from a distance, and only one of them is good news.

**Upgrading the framework mid-task.** Finish what you are doing first.

**Skipping Step 9.** Everyone wants to skip the trivial end-to-end run. It is the cheapest hour
in the project.

**Fixing the same bug twice in two apps.** That is what Part 4 exists for. Thirty seconds now,
or the whole bug again in three months.

---

## If you only remember five things

1. `/request` for anything you want built.
2. `npm run gate` before you merge. PASS or stop.
3. Colours live in `design/tokens.json`. Nowhere else.
4. `npm run framework:upgrade` between tasks, never during one.
5. `npm run capture` the moment you learn something worth keeping.
