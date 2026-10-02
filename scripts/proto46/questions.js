// prototypes/46-combo-prompts.html: the owner's questions, each pre-filled with its recommendation, and the copyable picks line
const Q = [
  ['What a prompt asks for', [
    ['A', 'A direction (or a tap / J), the same prompt on PC and phone: a key on PC, a swipe on the phone', true],
    ['B', 'Letters on PC (T Y B M, the four letters nothing uses), swipes on the phone'],
    ['C', 'Q W E R on PC as you first said: they answer a prompt while it is open, so W does not move and E does not use then (Q and R are reserved for Lightning Chain and Blade Recall)'],
    ['D', 'No prompts: keep the J ladder as it is']]],
  ['PC: how a direction is answered', [
    ['A', 'The direction + J (a chord, with 70 ms of slack either way): steering alone never answers by accident', true],
    ['B', 'The arrow alone, J for the tap prompt'],
    ['C', 'Either one counts']]],
  ['A miss or a wrong answer', [
    ['A', 'The chain ends and he takes a 0.45 s recovery (J does nothing) while the cut finishes', true],
    ['B', 'The chain ends, no lockout'],
    ['C', 'One slip a chain is forgiven: a new prompt comes, the hits count half']]],
  ['Time on a prompt', [
    ['A', 'No slow motion; a 0.35 s window after a 0.18 s ring. Brutal and quick', true],
    ['B', 'Light slow motion (×0.7) while a prompt is open'],
    ['C', 'Heavy slow motion (×0.4), more cinematic, slower fights']]],
  ['Where the prompt sits', [
    ['A', 'Over the enemy, with the ring closing round it (where K\'s prompt already sits)', true],
    ['B', 'Over the ronin'],
    ['C', 'A strip low on the screen, rhythm-game style']]],
  ['What the directions are', [
    ['A', 'Relative: → always toward the enemy (the arrow on screen flips with him), each a fixed cut as in the table', true],
    ['B', 'Fixed to the screen: → is always right, whichever side he is on'],
    ['C', 'Each weapon maps its own cuts to the directions']]],
  ['Phone movement', [
    ['A', 'Two thumbs: a floating stick on the left, gestures on the right', true],
    ['B', 'One thumb: a slow drag moves, a fast stroke is a swipe'],
    ['C', 'Both, picked in the settings']]],
  ['K on the phone', [
    ['A', 'Double tap (read on the second touch, so a single tap never waits)', true],
    ['B', 'Two-finger tap (then the skills need their own buttons)'],
    ['C', 'A K button on the right edge']]],
  ['Hold on the phone', [
    ['A', 'Charge: holding is I held (Thousand Cuts), letting go fires', true],
    ['B', 'Guard: he waits in a counter stance; the flick is the parry, for F\'s counter when it is built'],
    ['C', 'Charge the last skill used']]],
  ['Growth', [
    ['A', 'Basic skill sets the chain length (2 to 6 links, comboMax as today), and a mastered skill can appear as a link', true],
    ['B', 'Chain length only'],
    ['C', 'Fixed length; growth widens the window instead']]],
  ['Executions', [
    ['A', 'A finisher that lands next to a lone samurai offers K, so a chain can end in an execution', true],
    ['B', 'A and one prompt inside each execution, on its killing beat, for a bloodier ending'],
    ['C', 'Keep chains and executions apart']]],
  ['Free J', [
    ['A', 'Prompts always; Auto and Hold to continue in the settings for anyone who wants J alone', true],
    ['B', 'The free J ladder by default, prompts an option'],
    ['C', 'Prompts on the phone only']]],
];
const pick = Q.map(([, o]) => o.find(x => x[2])[0]);
const el = document.getElementById('questions');
function draw() {
  el.innerHTML = '';
  Q.forEach(([title, opts], i) => {
    const q = document.createElement('div'); q.className = 'q';
    q.innerHTML = `<h3>Q${i + 1} · ${title}</h3>`;
    const box = document.createElement('div'); box.className = 'opts'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', `Q${i + 1}`);
    for (const [id, txt, rec] of opts) { const b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.id = `q${i + 1}${id}`;
      b.setAttribute('aria-pressed', String(pick[i] === id));
      b.innerHTML = `<span class="id">${id}</span><span>${txt}${rec ? '<span class="rec">Recommended</span>' : ''}</span>`;
      b.onclick = () => { pick[i] = id; draw(); }; box.append(b); }
    q.append(box); el.append(q);
  });
  document.getElementById('pickline').textContent = line();
}
const line = () => 'Combo: ' + pick.map((p, i) => `Q${i + 1}${p}`).join(' ');
draw();
const copied = document.getElementById('copied');
document.getElementById('copy').addEventListener('click', () => {
  const t = line();
  const sel = () => { const r = document.createRange(); r.selectNodeContents(document.getElementById('pickline')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); copied.textContent = 'Selected: press Ctrl+C / ⌘C'; };
  try { navigator.clipboard.writeText(t).then(() => { copied.textContent = 'Copied'; }, sel); } catch (e) { sel(); }
});
