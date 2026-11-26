// Grounded AI Ear Anatomy Reaction Engine
// Explains in vivid, everyday UK plain English how EACH touched anatomical structure
// of the human ear (Pinna, Ear Canal, Earplug Zone, Eardrum, 3 Ossicles, Balance Canals,
// Cochlea & Hair Cells, Auditory Nerve) reacts under the currently selected hearing loss,
// earplug, or tinnitus state — with instant 0 ms physiology guides + optional on-device
// WebLLM streaming protected by our 3-layer medical-claim and technical-jargon guardrail.

import {
  MEDICAL_CLAIM_REGEX,
  buildSafeMedicalResponse,
  cleanExplanationText,
  isMedicalAdviceQuery,
} from './audio-explainer.mjs?v=c84af3279a';
import { ANATOMY_PART_BY_ID, normalisePartId } from './ear-anatomy-geometry.mjs?v=c84af3279a';

const TECHNICAL_JARGON_REGEX = /\b(?:\d+(?:\.\d+)?\s*(?:k?Hz|hertz|dB|decibels?)|kHz|decibels?|hertz|filterbank|dBFS)\b/i;

export const EFFECT_DISPLAY_LABELS = Object.freeze({
  original: 'Healthy Hearing (Unfiltered)',
  post_gig: 'Post-Gig Hearing Hangover (Temporary Muffling)',
  permanent_notch: 'Noise-Induced Hearing Loss (Permanent Notch)',
  severe_hf: 'Strong High-Pitch Hearing Loss',
  asymmetric: 'Uneven Hearing (One Ear Quieter)',
  foam_plugs: 'Standard Foam Earplugs',
  musician_plugs: 'Filtered Musicians’ Earplugs',
});

// Rich, physiologically grounded plain-English reaction matrix: 8 parts × 7 states!
const PART_REACTIONS = Object.freeze({
  pinna: {
    role: 'Funnels sound waves from the room into your ear canal and shapes bright details so you can tell whether a sound is in front of, behind, or above you.',
    states: {
      original: {
        status: 'Healthy · Capturing full room direction',
        reaction: 'Your outer ear folds catch every shimmer of guitars, cymbals, and voices around you, adding tiny directional clues before guiding the sound smoothly into your ear canal.',
      },
      post_gig: {
        status: 'Unchanged · Still gathering full sound',
        reaction: 'Even during a post-gig hearing hangover, your outer ear cartilage is completely unharmed and still funnels crisp directional details into the canal — the bottleneck happens deeper inside the inner ear, which cannot pick up those delicate cues right now.',
      },
      permanent_notch: {
        status: 'Intact · Directional cues lost deeper inside',
        reaction: 'Your outer ear still collects the bright reflections that tell you where a friend is standing in a busy bar, yet because the inner ear’s crisp-sound sensors are worn away, it feels much harder to pinpoint voices in a crowd.',
      },
      severe_hf: {
        status: 'Intact · Spatial sparkle fades inside',
        reaction: 'The outer ear’s curved ridges still funnel every sound wave normally, while the inner ear misses the high-pitched directional clues that give live music its sense of open space.',
      },
      asymmetric: {
        status: 'Both outer ears intact · Left/right balance uneven inside',
        reaction: 'Both outer ears gather sound from left and right, yet standing right beside a venue speaker stack has left one inner ear duller than the other — pulling music and pub conversation off-centre.',
      },
      foam_plugs: {
        status: 'Open · Canal entrance blocked just inside',
        reaction: 'Your outer ear still catches the live band’s energy, right up until the expanding foam plug seals the canal entrance and swallows the bright vocal and cymbal detail.',
      },
      musician_plugs: {
        status: 'Open · Feeding balanced acoustic filter',
        reaction: 'Your outer ear funnels the natural live sound straight into the musicians’ filter, preserving the band’s tone and spatial feel at a much safer level.',
      },
    },
  },

  canal: {
    role: 'Acts like a natural acoustic tunnel that carries sound to your eardrum and naturally amplifies the exact crisp speech and snare-drum tones our ears rely on most.',
    states: {
      original: {
        status: 'Open · Natural clarity boost',
        reaction: 'Because of its curved shape and length, your open ear canal naturally boosts crisp vocal consonants and bright snare hits on their way to the eardrum — helping speech cut through everyday noise.',
      },
      post_gig: {
        status: 'Overloaded at the gig · Resonance concentrated the blast',
        reaction: 'Here is why gigs hit speech clarity first: your open ear canal naturally amplifies bright mid-to-high sounds like a mini megaphone! At a loud concert, that extra boost concentrated intense energy onto one specific patch of your inner ear, leaving it temporarily exhausted.',
      },
      permanent_notch: {
        status: 'Open · Same resonance spot explains the classic gig notch',
        reaction: 'Sound still travels freely down the canal, which is why music still feels loud. Over repeated loud nights without plugs, the ear canal’s natural acoustic boost focused the heaviest wear onto the exact inner-ear zone that decodes crisp s, f, and t word sounds.',
      },
      severe_hf: {
        status: 'Open · Carrying full sound pressure',
        reaction: 'Waves still sweep cleanly down the S-shaped canal to the eardrum, meaning turning headphones right up still blasts full physical pressure down this tunnel even when treble sounds dull.',
      },
      asymmetric: {
        status: 'Open · Closer speaker side took heavier pressure',
        reaction: 'When one ear faces a loud stage monitor or club speaker stack, that side’s ear canal funnels far stronger sound waves inward than the sheltered ear on the other side of your head.',
      },
      foam_plugs: {
        status: 'Sealed with dense foam · Uneven muffling',
        reaction: 'Expanding foam fills the outer half of the canal and drinks up bright treble waves while heavy bass thumps still vibrate right past it — making vocals sound muffled and underwater.',
      },
      musician_plugs: {
        status: 'Protected · Gentle, even wave heights',
        reaction: 'Inside the canal, the precision filter calms down booming bass and piercing highs equally before they travel further inward — keeping the ear canal’s natural vocal clarity intact.',
      },
    },
  },

  earplug: {
    role: 'Sits snugly in the outer cartilaginous part of the ear canal to calm dangerous gig and club sound pressure before it ever reaches your eardrum or delicate hair cells.',
    states: {
      original: {
        status: 'No earplug worn · Fine for quiet rooms, risky at loud gigs',
        reaction: 'Nothing is sitting in the earplug zone right now. At normal everyday listening volumes your ears are completely happy bare — at loud gigs or clubs, leaving this spot open sends raw speaker blasts straight into your inner ear.',
      },
      post_gig: {
        status: 'Unprotected at the gig · Why the hangover happened',
        reaction: 'Because this protection zone was empty during the gig, hours of intense sound waves slammed straight past here and fatigued your inner-ear hair cells. Giving your ears quiet rest lets temporary muffling settle, and wearing filtered plugs next time skips the hangover.',
      },
      permanent_notch: {
        status: 'Crucial for protecting your remaining clarity',
        reaction: 'Once inner-ear hair cells are permanently lost, nothing can regrow them — which makes slipping filtered musicians’ earplugs into this spot at future concerts the best way to keep every bit of musical clarity you still have.',
      },
      severe_hf: {
        status: 'Essential shield for remaining hair cells',
        reaction: 'Placing a filtered earplug here in loud venues shields your remaining working inner-ear sensors from further wear without cutting you off from the beat and atmosphere.',
      },
      asymmetric: {
        status: 'Protects both ears equally near PA stacks',
        reaction: 'Wearing filtered earplugs in both canals acts like a safety cushion even when you end up standing right next to a loud bar speaker on one side.',
      },
      foam_plugs: {
        status: 'Foam inserted · Protects ears, dulls the music',
        reaction: 'Dense yellow foam swells against the canal wall. It shields your inner ear from harm, yet because porous foam blocks bright guitar and vocal sparkle far more than heavy bass, bands sound muddy — tempting gig-goers to pull them out!',
      },
      musician_plugs: {
        status: 'Musicians’ plug active · Safe AND crystal clear',
        reaction: 'Three soft silicone flanges seal comfortably while the tiny silver acoustic duct in the middle lowers deep bass, warm vocals, and shimmering cymbals by the same gentle amount — like turning down a master studio fader!',
      },
    },
  },

  eardrum: {
    role: 'A thin, pearly cone-shaped membrane at the end of the ear canal that turns airborne sound waves into tiny mechanical vibrations.',
    states: {
      original: {
        status: 'Vibrating cleanly across bass and treble',
        reaction: 'Your cone-shaped eardrum flexes smoothly with slow, deep drum beats and quivers rapidly with delicate cymbal shimmer and vocal breaths, passing every nuance onto the middle-ear bones.',
      },
      post_gig: {
        status: 'Still flexing normally · Why bass still feels loud!',
        reaction: 'Notice how the eardrum is still flexing strongly! Typical post-gig muffling is NOT a stretched eardrum — your eardrum still catches the full punch of kick drums and bass guitars, which is why turning your volume up makes bass feel booming.',
      },
      permanent_notch: {
        status: 'Mechanically intact · Passing vibrations faithfully',
        reaction: 'Even with permanent noise-induced hearing loss, the eardrum itself usually vibrates just as well as ever. It faithfully passes both bass and crisp word vibrations inward — the breakdown happens later inside the snail-shaped cochlea.',
      },
      severe_hf: {
        status: 'Intact · Cranking headphone volume slams this drum',
        reaction: 'Because your eardrum still receives 100% of the physical push from headphones, cranking volume to chase missing treble makes this membrane thump uncomfortably hard on loud beats.',
      },
      asymmetric: {
        status: 'Both eardrums flexing · Inner-ear sensitivity differs',
        reaction: 'Both left and right eardrums vibrate cleanly with the music; the uneven balance comes from tired or damaged hair cells deeper inside one cochlea.',
      },
      foam_plugs: {
        status: 'Receiving mostly low-end thump',
        reaction: 'Behind the foam plug, rapid high-pitched ripples barely reach the eardrum, so the membrane mostly rocks back and forth to muffled bass and low vocals.',
      },
      musician_plugs: {
        status: 'Gentle, balanced excursion',
        reaction: 'Behind the musicians’ filter, the eardrum vibrates with the exact same crisp musical shape as bare ears — just with smaller, safer swings that never overload the inner ear.',
      },
    },
  },

  ossicles: {
    role: 'The three smallest bones in the human body — the hammer (malleus), anvil (incus), and stirrup (stapes) — forming a precision lever bridge that pushes fluid waves into the inner ear.',
    states: {
      original: {
        status: 'Crisp lever transfer into the Oval Window',
        reaction: 'As the eardrum moves, the hammer rocks the anvil, which nudges the tiny stirrup footplate in and out of the inner ear’s oval window — matching air vibrations cleanly to inner-ear fluid.',
      },
      post_gig: {
        status: 'Tiny reflex muscle tired out during sustained gig noise',
        reaction: 'Tiny middle-ear muscles try to stiffen this bone chain during sudden bangs, yet non-stop club and concert music quickly fatigues that natural reflex — allowing heavy vibrations to keep piston-driving the inner-ear fluid.',
      },
      permanent_notch: {
        status: 'Still driving full bass energy into the cochlea',
        reaction: 'All three tiny bones remain intact and keep pumping full-strength drum and vowel vibrations through the oval window, explaining why everyday sounds still feel loud even when words sound blurry.',
      },
      severe_hf: {
        status: 'Intact bone bridge · Keep listening levels comfortable',
        reaction: 'Because these three bones still transmit physical sound force efficiently into the inner ear, keeping headphone volume steady protects your remaining cochlear hair cells from excessive fluid slams.',
      },
      asymmetric: {
        status: 'Bone levers intact · Asymmetric cochlear response',
        reaction: 'Both middle-ear bone chains pivot normally; the quieter side stems from sensory hair-cell wear beyond the stirrup’s oval window.',
      },
      foam_plugs: {
        status: 'Rocking slowly on bass-heavy waves',
        reaction: 'With bright overtones soaked up by the foam plug, the hammer, anvil, and stirrup mostly rock on slower, heavier bass rhythms.',
      },
      musician_plugs: {
        status: 'Protected · Smooth, gentle stirrup motion',
        reaction: 'With sound pressure tamed evenly before the eardrum, the stirrup footplate glides gently at the oval window — delivering every musical detail without hammering the cochlear fluid.',
      },
    },
  },

  vestibular: {
    role: 'Three fluid-filled semicircular loops set at right angles plus the vestibule chamber — your inner ear’s gyroscope for head motion and balance, sharing fluid walls with the cochlea.',
    states: {
      original: {
        status: 'Steady · Sensing balance independently of music',
        reaction: 'Right beside the cochlea, these three fluid loops track every nod and turn of your head while the neighbouring snail-shell cochlea handles music and speech.',
      },
      post_gig: {
        status: 'Usually spared · Connected to the same inner-ear fluid space',
        reaction: 'Because these balance loops sit right next door to the cochlea inside the same tiny bony labyrinth, extremely booming club bass can occasionally feel disorienting, though a typical hearing hangover mainly fatigues the cochlea’s sound hair cells.',
      },
      permanent_notch: {
        status: 'Balance loops intact · Noise wear targets cochlear hair cells',
        reaction: 'Loud music travels directly past the oval window into the cochlea’s sound spiral rather than circulating strongly through these balance loops — so concert noise wears down hearing clarity while balance stays normal.',
      },
      severe_hf: {
        status: 'Balance steady · Shared inner-ear sanctuary',
        reaction: 'These three balance arches remind us how delicate and compact the inner ear is — housing both your sense of balance and irreplaceable sound sensors inside a space smaller than a marble.',
      },
      asymmetric: {
        status: 'Balance steady · Spatial sound cues rely on both cochleas',
        reaction: 'While your balance canals keep you steady on your feet, uneven cochlear hearing between left and right can make spinning around to spot who called your name feel trickier.',
      },
      foam_plugs: {
        status: 'Calm inner-ear fluid pressure',
        reaction: 'Cutting peak concert pressure in the ear canal keeps intense fluid shockwaves away from the entire inner-ear labyrinth.',
      },
      musician_plugs: {
        status: 'Calm & comfortable all night',
        reaction: 'Filtered plugs tame overwhelming sub-bass slams at festivals and clubs while letting you move, dance, and chat naturally.',
      },
    },
  },

  cochlea: {
    role: 'A fluid-filled snail shell lined with thousands of microscopic hair cells — stiff outer turns near the entrance catch crisp cymbals and s/t consonants, while the deep centre tip catches warm bass.',
    states: {
      original: {
        status: 'All hair cells upright · Full sparkle + deep bass',
        reaction: 'Watch the glowing hair-cell bundles along the cutaway spiral: front outer bundles dance to crisp hi-hats and sharp word edges (s, f, th, t), while deep centre bundles bounce to bass guitar and kick drums!',
      },
      post_gig: {
        status: 'Amber fatigue · High-pitch hair cells bent & exhausted!',
        reaction: 'Look at the amber drooping bundles in the outer turn! Hours of loud gig sound bent and exhausted the delicate hair cells that catch cymbals and crisp vocal consonants, while the deep bass hair cells at the centre tip stayed strong — making music sound muffled.',
      },
      permanent_notch: {
        status: 'Red loss zone · Noise-notch hair cells permanently gone',
        reaction: 'See the flattened red zone a third of the way around the spiral? Repeated loud exposure permanently destroyed those sensitive hair cells. Humans cannot regrow inner-ear hair cells: deep bass cells still fire at full volume, yet turning speakers up cannot bring back lost consonant clarity.',
      },
      severe_hf: {
        status: 'Widespread outer-turn loss · Only deep bass apex active',
        reaction: 'Across the entire front and middle turns of the snail shell, hair cells have gone dark, leaving only the deep centre bass cells working — which also widens the ear’s tuning so voices and background music smear together.',
      },
      asymmetric: {
        status: 'One cochlea worn down more than the other',
        reaction: 'Hair cells in the more exposed ear have lost sensitivity in the crisp vocal turns, making headphones sound lopsided and making noisy restaurants or pubs much more tiring.',
      },
      foam_plugs: {
        status: 'Hair cells safe · Starved of bright musical detail',
        reaction: 'Every hair cell stays healthy and upright, yet because the foam plug stripped out the high notes back in the ear canal, the front sparkle hair cells barely receive anything to dance to.',
      },
      musician_plugs: {
        status: 'Every hair cell healthy, upright & dancing evenly!',
        reaction: 'Because the musicians’ filter tamed the loud gig evenly, both the front cymbal/vocal hair cells and the deep bass hair cells dance safely within their comfort zone — zero hangover tomorrow!',
      },
    },
  },

  nerve: {
    role: 'Bundles thousands of delicate nerve fibres from the cochlea to carry split-second musical timing and speech patterns up to your brain.',
    states: {
      original: {
        status: 'Clean, synchronised neural pulses to the brain',
        reaction: 'Smooth blue nerve pulses stream steadily toward your brain, locking onto the exact split-second timing of voices so you can effortlessly follow a friend’s story in a lively café.',
      },
      post_gig: {
        status: 'Overworked synapses · Blurry speech in noisy bars',
        reaction: 'Loud exposure stresses the tiny ribbon connections between hair cells and this nerve ("hidden hearing loss"), scrambling the split-second timing your brain needs to pick one voice out from pub chatter.',
      },
      permanent_notch: {
        status: 'Missing consonant signals · Brain has to guess words',
        reaction: 'Because the damaged cochlear zone sends almost no nerve signals for sharp s, f, t, and k sounds, your brain receives incomplete word puzzles — working overtime to guess lyrics and conversation.',
      },
      severe_hf: {
        status: 'Heavily reduced high-pitch nerve fibres',
        reaction: 'Only low-pitch nerve fibres are firing strongly, forcing your brain to rely heavily on lip-reading and context whenever there is background noise.',
      },
      asymmetric: {
        status: 'Uneven left/right nerve streams',
        reaction: 'Your brain compares split-second differences between left and right auditory nerves to locate sounds in 3D space — when one nerve stream is weaker, busy rooms feel much harder to navigate.',
      },
      foam_plugs: {
        status: 'Protected · Sending a bass-heavy, muffled stream',
        reaction: 'The nerve connections stay completely safe from concert overload, though the brain receives a duller, bass-heavy version of the live band.',
      },
      musician_plugs: {
        status: 'Protected · Crisp, stress-free nerve signalling',
        reaction: 'Nerve synapses stay completely protected from gig stress while carrying clear, natural vocal and instrument detail to your brain all night.',
      },
    },
  },
});

function buildTinnitusAddon(partId, tinnitus) {
  if (tinnitus !== 'ringing' && tinnitus !== 'hiss') return '';
  const soundWord = tinnitus === 'ringing' ? 'high-pitched ringing' : 'rushing hiss';
  if (partId === 'nerve') {
    return `\n\nActive ${tinnitus} here: When tired or missing hair cells send fewer real sound signals along this auditory nerve, your brain’s hearing pathways turn up their own internal sensitivity — sparking spontaneous phantom ${soundWord} signals even in a dead-quiet room.`;
  }
  if (partId === 'cochlea') {
    return `\n\nWhy ${tinnitus} starts here: When outer hair cells in this spiral are fatigued or missing, that quiet gap prompts the connected nerve pathways to fire spontaneous ${soundWord} on their own, standing out sharpest when the music fades.`;
  }
  return `\n\nWith ${tinnitus} active: Notice no physical ${soundWord} is entering through this structure — tinnitus is generated internally along the cochlear nerve and brain pathways when inner-ear hair cells are stressed, which is why covering your ears does not block it.`;
}

export function getInstantEarPartExplanation(partId = 'cochlea', effectKey = 'original', tinnitus = 'off') {
  const cleanPart = normalisePartId(partId);
  const partMeta = ANATOMY_PART_BY_ID[cleanPart];
  const entry = PART_REACTIONS[cleanPart] ?? PART_REACTIONS.cochlea;
  const cleanEffect = entry.states[effectKey] ? effectKey : 'original';
  const stateInfo = entry.states[cleanEffect];
  const tinAddon = buildTinnitusAddon(cleanPart, tinnitus);

  return {
    partId: cleanPart,
    partIndex: partMeta.index,
    partRegion: partMeta.region,
    partTitle: partMeta.title,
    partLatin: partMeta.latin,
    partIcon: partMeta.icon,
    partAccent: partMeta.accent,
    effectKey: cleanEffect,
    effectLabel: EFFECT_DISPLAY_LABELS[cleanEffect] || EFFECT_DISPLAY_LABELS.original,
    statusBadge: stateInfo.status,
    roleSummary: entry.role,
    reactionText: `${stateInfo.reaction}${tinAddon}`,
    fullMessage: `${partMeta.title} — ${entry.role}\n\n${stateInfo.reaction}${tinAddon}`,
  };
}

export function getPartStarterQuestions(partId = 'cochlea', tinnitus = 'off') {
  const cleanPart = normalisePartId(partId);
  const byPart = {
    pinna: [
      'How does the outer ear help me locate voices?',
      'Does loud music damage the outer ear?',
      'Why do busy bars feel confusing with hearing loss?',
    ],
    canal: [
      'Why does the ear canal make gigs hit speech clarity first?',
      'Why doesn’t turning volume up fix muffling?',
      'Where do earplugs sit inside the ear canal?',
    ],
    earplug: [
      'Why do musicians’ earplugs sound clearer than foam?',
      'Will earplugs stop me enjoying live music?',
      'Can earplugs prevent a post-gig hearing hangover?',
    ],
    eardrum: [
      'Is post-gig muffling caused by the eardrum or inner ear?',
      'Why does bass still boom on the eardrum?',
      'What happens to the eardrum with filtered earplugs?',
    ],
    ossicles: [
      'How do the 3 tiny bones pass sound inward?',
      'Why can’t our ear muscles block a whole loud concert?',
      'Why do drums still hit hard when treble is lost?',
    ],
    vestibular: [
      'Why are balance canals attached to the hearing snail?',
      'Does concert noise affect balance or mainly cochlear hair cells?',
      'Why is the inner ear filled with fluid?',
    ],
    cochlea: [
      'Why can’t damaged inner-ear hair cells grow back?',
      'Why do cymbals and s/t words fade while bass stays loud?',
      'What happens inside the cochlea during a hearing hangover?',
    ],
    nerve: [
      'Why does tinnitus sound louder in a quiet room?',
      'How does nerve stress blur voices in a noisy pub?',
      'Why doesn’t covering your ears stop ringing?',
    ],
  };
  const base = [...(byPart[cleanPart] || byPart.cochlea)];
  if ((tinnitus === 'ringing' || tinnitus === 'hiss') && cleanPart !== 'nerve') {
    base[2] = `Where is the ${tinnitus} sound actually coming from in the ear?`;
  }
  return base;
}

export function answerEarPartQuestionInstant({
  partId = 'cochlea',
  effectKey = 'original',
  tinnitus = 'off',
  question = '',
} = {}) {
  const q = String(question || '').trim();
  if (isMedicalAdviceQuery(q)) {
    return buildSafeMedicalResponse(null);
  }
  const base = getInstantEarPartExplanation(partId, effectKey, tinnitus);
  const lower = q.toLowerCase();

  if (/grow\s*back|regrow|permanent|recover|temporary|hangover/.test(lower)) {
    return `Inside the human cochlea, we are born with a fixed set of delicate sensory hair cells — unlike birds or reptiles, human inner-ear hair cells cannot regrow once they are destroyed. After a single loud night out ("hearing hangover"), bent hair-cell tips often recover with quiet rest, whereas repeated unprotected loud gigs wear them away for good.\n\nRight now under ${base.effectLabel}, ${base.reactionText.split('\n\n')[0]}`;
  }
  if (/foam|musician|filter|plug/.test(lower)) {
    return `Standard foam plugs seal the ear canal with dense sponge that soaks up crisp vocal and cymbal detail while letting heavy bass rumble through, making live music sound dull and underwater. Filtered musicians’ earplugs use a tiny tuned acoustic channel inside a soft silicone seal so deep bass, warm vocals, and bright cymbals step down evenly together — keeping the band crystal clear while shielding your cochlear hair cells.`;
  }
  if (/tinnitus|ring|hiss|quiet|silence|cover/.test(lower)) {
    return `Tinnitus ringing or hiss does not come from outside air vibrating your outer ear or eardrum — which is why putting hands over your ears never blocks it. When inner-ear hair cells are fatigued or missing after loud sound, the auditory nerve and brain pathways turn up their own internal "gain" searching for the missing signal, creating phantom ringing or hiss that stands out sharpest once the room goes quiet.`;
  }
  if (/bass|volume|turn.*up|loud|boom/.test(lower)) {
    return `Loud gigs wear out the fragile hair cells near the entrance of the cochlea (which catch crisp cymbals and sharp s, f, and t word sounds) long before the flexible bass hair cells deep at the tip. Because your eardrum, tiny ear bones, and bass hair cells still respond at full strength, cranking headphone volume makes the bass boom uncomfortably without sharpening blurred words.`;
  }
  if (/pub|bar|crowd|speech|voice|word|blur|mumble/.test(lower)) {
    return `Vowels and background bar chatter sit in warmer, lower notes that still come through plenty loud, whereas telling words apart ("sat" vs "fat" vs "cat") depends on tiny, crisp consonant sounds picked up by the outer cochlear turn and carried by fast auditory-nerve fibres. When those sensors are tired or damaged, speech sounds loud enough to hear someone talking yet blurs into surrounding pub noise.`;
  }
  if (/how\s*long|last|tomorrow|morning|sleep|rest|hours|days/.test(lower)) {
    return `After a single loud gig, temporary muffling or ringing ("hearing hangover") means your outer hair cells and nerve connections were overworked. Quiet rest away from loud speakers gives exhausted hair cells their best chance to settle, though repeated loud nights build up permanent wear — check RNID’s guide or free 3-minute online hearing check if changes linger.`;
  }
  if (/zoom|look|colour|color|red|amber|green|spark|glow|see/.test(lower)) {
    return `When you zoom into ${base.partTitle}, green/teal highlights show healthy, responsive sensors, warm amber marks temporarily fatigued hair cells after a loud gig, and coral-red marks permanently flattened hair cells in the classic noise-notch region. Along the auditory nerve, golden or violet pulses illustrate spontaneous internal tinnitus firing.`;
  }
  if (/safe|protect|gig|concert|festival|club|break|headphone|earbud/.test(lower)) {
    return `Three habits protect ${base.partTitle} without spoiling a night out: slip in filtered musicians’ earplugs so music stays clear at a gentler level, step a couple of metres back from main speaker stacks, and take short 5-minute chill-out breaks so your inner-ear hair cells can catch their breath.`;
  }
  if (/bone|smallest|hammer|anvil|stirrup|drum|snail|fluid|balance|dizzy/.test(lower)) {
    return `${base.partTitle} (${base.partLatin}): ${base.roleSummary}\n\nUnder ${base.effectLabel}, ${base.reactionText.split('\n\n')[0]}`;
  }

  return `Looking at ${base.partTitle} under ${base.effectLabel}: ${base.reactionText}\n\nRole in healthy hearing: ${base.roleSummary}`;
}

export function buildDeepDivePhysiologySummary(partId = 'cochlea', effectKey = 'original', tinnitus = 'off') {
  const info = getInstantEarPartExplanation(partId, effectKey, tinnitus);
  const protectTip = effectKey === 'musician_plugs'
    ? 'With filtered musicians’ earplugs in place, sound waves arrive evenly tamed so you hear every vocal and cymbal nuance without post-gig fatigue.'
    : effectKey === 'foam_plugs'
      ? 'Swapping dense foam for filtered musicians’ earplugs keeps the same ear protection while restoring natural vocal and guitar sparkle.'
      : 'Filtered musicians’ earplugs and short quiet breaks at gigs shield delicate cochlear hair cells before temporary fatigue turns permanent.';
  return `${info.partTitle} (${info.partLatin}) — Deep-Dive\n\nHow it works: ${info.roleSummary}\n\nWhat happens under ${info.effectLabel}: ${info.reactionText}\n\nTakeaway for live music: ${protectTip}`;
}

export function buildEarAnatomyAiPrompt({
  partId = 'cochlea',
  effectKey = 'original',
  tinnitus = 'off',
  userQuestion = '',
} = {}) {
  const info = getInstantEarPartExplanation(partId, effectKey, tinnitus);
  const trimmedQ = String(userQuestion || '').trim();

  const system = [
    'You are a warm, engaging interactive 3D human ear anatomy educator for the UK charity RNID ("Don’t Lose the Music").',
    'PLAIN-ENGLISH & SAFETY RULES:',
    '1. Write 2 short, vivid plain-text paragraphs (75 to 125 words total). NEVER use Markdown headings (#), bullet lists, or technical audio units.',
    '2. STRICTLY FORBIDDEN: Never write Hz, kHz, decibels, or dB, and NEVER give medical advice, personal diagnoses, cures, medications, or claims about the user’s own ears.',
    '3. Directly explain how the exact touched part of the human ear works and how it is reacting right now under the active hearing-loss, earplug, or tinnitus state in everyday musical terms (drums, bass, vocals, cymbals, noisy pubs, filtered earplugs).',
  ].join('\n');

  const user = [
    `TOUCHED 3D EAR PART: ${info.partTitle} (${info.partLatin})`,
    `WHAT THIS PART NORMALLY DOES: ${info.roleSummary}`,
    `ACTIVE SOUND / HEARING STATE: ${info.effectLabel}${tinnitus !== 'off' ? ` + ${tinnitus} tinnitus` : ''}`,
    `VERIFIED PHYSIOLOGICAL REACTION: ${info.reactionText.replace(/\s+/g, ' ').trim()}`,
    '',
    trimmedQ
      ? `Visitor question while touching ${info.partTitle}: "${trimmedQ}"\nAnswer warmly in 2 short plain-English paragraphs (no Hz, no kHz, no dB, no bullets, no medical advice).`
      : `Explain warmly in 2 short plain-English paragraphs (no Hz, no kHz, no dB, no bullets, no medical advice) what the visitor just touched on the 3D ear and how this structure reacts under ${info.effectLabel}.`,
  ].join('\n');

  return {
    system,
    user,
    info,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };
}

export function validateAnatomyAiOutput(rawText = '') {
  const cleaned = cleanExplanationText(rawText);
  if (!cleaned) return { valid: false, reason: 'empty', cleaned };
  if (TECHNICAL_JARGON_REGEX.test(rawText) || TECHNICAL_JARGON_REGEX.test(cleaned)) {
    return { valid: false, reason: 'technical_jargon', cleaned };
  }
  if (MEDICAL_CLAIM_REGEX.test(rawText) || MEDICAL_CLAIM_REGEX.test(cleaned)) {
    return { valid: false, reason: 'medical_claim', cleaned };
  }
  if ((cleaned.match(/^\s*[-*•]\s+/gm) || []).length >= 3) {
    return { valid: false, reason: 'bullet_list', cleaned };
  }
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 30) return { valid: false, reason: 'too_short', cleaned };
  if (!/[.!?]["')\]]*$/.test(cleaned)) return { valid: false, reason: 'incomplete', cleaned };
  return { valid: true, reason: 'ok', cleaned };
}

export async function generateEarPartAiResponse({
  llmClient = null,
  partId = 'cochlea',
  effectKey = 'original',
  tinnitus = 'off',
  userQuestion = '',
  useModel = false,
  signal,
  onToken,
} = {}) {
  if (isMedicalAdviceQuery(userQuestion)) {
    const safe = buildSafeMedicalResponse(null);
    onToken?.(safe);
    return { text: safe, source: 'safety_guardrail' };
  }

  const instantFallback = userQuestion
    ? answerEarPartQuestionInstant({ partId, effectKey, tinnitus, question: userQuestion })
    : (useModel
        ? buildDeepDivePhysiologySummary(partId, effectKey, tinnitus)
        : getInstantEarPartExplanation(partId, effectKey, tinnitus).fullMessage);

  const modelReady = Boolean(llmClient && llmClient.isSupported?.() && (useModel || llmClient.getLoadedModel?.()));
  if (!modelReady) {
    onToken?.(instantFallback);
    return { text: instantFallback, source: 'instant_physiology' };
  }

  const prompt = buildEarAnatomyAiPrompt({ partId, effectKey, tinnitus, userQuestion });
  // Ensure the shared WebLLM worker engine is loaded (joins existing load if already cached)
  await llmClient.preload();
  if (signal?.aborted) return { text: '', source: 'aborted', aborted: true };

  // Use custom low-temperature chat stream if exposed, else route via client fallback
  let streamedRaw = '';
  try {
    const res = await llmClient.generateCustomAnatomy?.({
      messages: prompt.messages,
      signal,
      onToken: (partial) => {
        streamedRaw = partial;
        const cleanedPartial = cleanExplanationText(partial);
        if (cleanedPartial && !TECHNICAL_JARGON_REGEX.test(partial) && !MEDICAL_CLAIM_REGEX.test(partial)) {
          onToken?.(cleanedPartial);
        }
      },
    });
    if (res?.aborted || signal?.aborted) {
      return { text: cleanExplanationText(streamedRaw), source: 'aborted', aborted: true };
    }
    if (res?.text) {
      const v = validateAnatomyAiOutput(res.text);
      if (v.valid) {
        onToken?.(v.cleaned);
        return { text: v.cleaned, source: 'webllm' };
      }
    }
  } catch {
    // Graceful fallback to verified physiological answer below
  }

  onToken?.(instantFallback);
  return { text: instantFallback, source: 'instant_physiology' };
}
