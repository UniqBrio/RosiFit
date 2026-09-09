-- 0066 · every follow-up email says how to stop getting them
--
-- WHY THIS IS A MIGRATION
-- The wording lives in the database (email_templates, 0009), not in the repo.
-- There is no free-form send path -- C-68, and the whole of guardrail 5 -- so
-- the only way a sentence reaches a member is by being in a stored template.
-- Editing the template through the UI would leave the tree unable to say what
-- the academy actually sends; this is the additive way to change wording.
--
-- WHAT IT ADDS
-- One line, and the {{unsubscribe_url}} placeholder that send-followups
-- substitutes per recipient the way it already substitutes {{first_name}} --
-- the URL is signed per address, so it cannot be a constant in the template.
--
-- THE TONE IS DELIBERATE. This is an academy writing to its own members about
-- attendance, not a marketing list working off a footer. "If you would rather
-- not get these" is how the rest of this template already speaks ("Nothing is
-- wrong -- we would just like to see you back on the mat"), and a member who
-- wants out should not have to read past a wall of small print to find the
-- way. Gender-neutral, like every other member-facing string here.
--
-- APPLIED TO EVERY STORED TEMPLATE, not only the default. A follow-up sent
-- from a second template would otherwise carry no visible way to opt out, and
-- which template an operator picks is not something this file can know.
-- Templates created AFTER this migration are not covered by it -- see the
-- note at the end.
--
-- RE-RUNNABLE. The `not like '%{{unsubscribe_url}}%'` guard means applying
-- this twice cannot append the line twice, and it means a template somebody
-- has already worded for themselves is left exactly as they wrote it.

update public.email_templates
   set body_text = body_text
     || E'\n\n--\nIf you would rather not get these check-ins, you can stop them here:\n{{unsubscribe_url}}'
 where body_text not like '%{{unsubscribe_url}}%';

-- The HTML body is optional and is NULL on this project today, so this
-- updates nothing here. It is written anyway: a template that gains an HTML
-- body later must not be the one that quietly loses the line, and finding
-- that out from a bounce complaint is finding it out too late.
update public.email_templates
   set body_html = body_html
     || '<hr><p style="font-size:14px;color:#4a4a4a;">If you would rather not get these '
     || 'check-ins, you can <a href="{{unsubscribe_url}}">stop them here</a>.</p>'
 where body_html is not null
   and body_html not like '%{{unsubscribe_url}}%';

-- STILL OPEN, recorded here rather than left to be discovered:
-- a template created through Settings AFTER this migration carries no
-- unsubscribe line unless whoever writes it includes {{unsubscribe_url}}.
-- Nothing in the schema requires it. What holds regardless is the
-- List-Unsubscribe / List-Unsubscribe-Post header pair, which send-followups
-- sets on EVERY message from the recipient's own signed link -- so one-click
-- unsubscribe works even from a template that forgot the sentence. Making the
-- visible line unskippable is a change to the template form, not to this
-- file.
