\echo 'normalisation: the only identity signal the attendance CSV gives us'
-- Every one of these is a plausible Google Meet display name for one member.
-- If any pair disagrees, that member silently fails to match her own alias.
select t.eq(normalize_name('Shazia F'),      'shazia f', 'plain');
select t.eq(normalize_name('shazia f'),      'shazia f', 'case folded');
select t.eq(normalize_name('  Shazia F  '),  'shazia f', 'outer whitespace');
select t.eq(normalize_name('Shazia  F'),     'shazia f', 'doubled inner space');
select t.eq(normalize_name('Shazia F.'),     'shazia f', 'trailing period');
select t.eq(normalize_name('-Shazia-F-'),    'shazia f', 'punctuation at both edges');
select t.eq(normalize_name('(Shazia F)'),    'shazia f', 'bracketed');
select t.eq(normalize_name('Shazia_F'),      'shazia f', 'underscore');
select t.eq(normalize_name('Shazia F 🌸'),   'shazia f', 'emoji suffix');
select t.eq(normalize_name('Shāziā F'),      'shazia f', 'accents folded');

-- and the things that must NOT normalise to a usable key
select t.eq(normalize_name('   '),  null::text, 'whitespace only -> NULL');
select t.eq(normalize_name('---'),  null::text, 'punctuation only -> NULL');
select t.eq(normalize_name(''),     null::text, 'empty -> NULL');
select t.eq(normalize_name(null),   null::text, 'NULL -> NULL');

-- distinct people must stay distinct
select t.ok(normalize_name('Shazia Farheen') <> normalize_name('Shazia Khan'),
  'two different members do not collide');

select t.eq(normalize_email('  SHAZIA@Example.COM ')::text, 'shazia@example.com', 'emails fold too');
select t.eq(normalize_email('   ')::text, null::text, 'blank email -> NULL');
