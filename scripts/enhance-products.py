#!/usr/bin/env python3
"""
Enhance all product descriptions in products.json:
- Add structured, humanized product descriptions
- Include transactional SEO keywords per product type
- Add specs, features, and buying signals
- Keep existing useful content, augment what's thin
"""

import json
import re
import random
import html
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PRODUCTS_FILE = os.path.join(SCRIPT_DIR, '..', 'src', 'data', 'products.json')

# ---------------------------------------------------------------------------
# Transactional keyword maps – high-volume, low-competition buyer phrases
# ---------------------------------------------------------------------------
TRANSACTIONAL_KEYWORDS = {
    'EJUICE': [
        'buy {flavour} vape juice online',
        'buy {brand} e-liquid Deutschland',
        '{brand} vape juice for sale',
        'best {flavour} e-liquid Deutschland',
        'order {brand} e-juice online',
        'cheap {brand} vape juice',
    ],
    'e-juice': [
        'buy {flavour} vape juice online',
        'buy {brand} e-liquid Deutschland',
        '{brand} e-juice for sale',
    ],
    'ejuice': [
        'buy {flavour} vape juice online',
        '{brand} vape juice Deutschland',
    ],
    'Starter Kits': [
        'buy {brand} vape kit online',
        'best vape starter kit Deutschland',
        '{brand} starter kit for sale',
        '{brand} vape kit price Deutschland',
    ],
    'Pod Kits': [
        'buy {brand} pod system online',
        'best pod vape Deutschland',
        '{brand} pod kit for sale',
        'buy pod vape Deutschland',
    ],
    'Mods': [
        'buy {brand} vape mod online',
        'best box mod Deutschland',
        '{brand} mod for sale',
        'buy vape mod Deutschland',
    ],
    'mod': [
        'buy {brand} vape mod online',
        'best box mod Deutschland',
    ],
    'Box Mod': [
        'buy {brand} box mod online',
        'best box mod Deutschland',
        '{brand} box mod for sale',
    ],
    'Squonk Mod': [
        'buy squonk mod Deutschland',
        '{brand} squonk mod for sale',
    ],
    'Squank Mods': [
        'buy squonk mod Deutschland',
        '{brand} squonk mod for sale',
    ],
    'Coils & Cartridge': [
        'buy {brand} replacement coils online',
        '{brand} coils Deutschland',
        'best replacement coils for {brand}',
        'buy vape coils online Deutschland',
    ],
    'coils': [
        'buy {brand} replacement coils',
        '{brand} coils Deutschland',
    ],
    'COILS & CARTRIDGE': [
        'buy {brand} replacement coils',
        '{brand} coils Deutschland',
    ],
    'catridge': [
        'buy {brand} replacement pod cartridge',
        '{brand} cartridge Deutschland',
    ],
    'Replacement Coil': [
        'buy {brand} replacement coils Deutschland',
        '{brand} coils for sale',
    ],
    'Tanks': [
        'buy {brand} vape tank online',
        'best sub ohm tank Deutschland',
        '{brand} tank for sale',
    ],
    'tank': [
        'buy {brand} vape tank online',
        'best vape tank Deutschland',
    ],
    'Sub Ohm Tank': [
        'buy sub ohm tank Deutschland',
        'best sub ohm tank {brand}',
    ],
    'RDA': [
        'buy {brand} RDA online',
        'best RDA Deutschland',
        '{brand} RDA for sale',
    ],
    'RTA': [
        'buy {brand} RTA online',
        'best RTA Deutschland',
        '{brand} RTA for sale',
    ],
    'rta': [
        'buy {brand} RTA online',
        'best RTA Deutschland',
    ],
    'RDTA': [
        'buy {brand} RDTA online',
        'best RDTA Deutschland',
    ],
    'Batteries': [
        'buy vape batteries Deutschland',
        'best 18650 battery for vaping',
        '{brand} vape battery for sale',
    ],
    'Replacement Glass': [
        'buy {brand} replacement glass tube',
        '{brand} tank glass replacement Deutschland',
    ],
    'glass': [
        'buy {brand} replacement glass',
        '{brand} glass tube Deutschland',
    ],
    'Drip Tips': [
        'buy vape drip tips Deutschland',
        'best 510 drip tip',
        'buy 810 drip tip online',
    ],
    'Accessories': [
        'buy vape accessories Deutschland',
        '{brand} vape accessories for sale',
        'best vape accessories online',
    ],
    'Dry Herb Vaporizer': [
        'buy dry herb vaporizer Deutschland',
        'best dry herb vape {brand}',
        '{brand} dry herb vaporizer for sale',
    ],
    'CBD': [
        'buy CBD vape Deutschland',
        'best CBD e-liquid online',
        '{brand} CBD for sale',
    ],
    'CBD THC': [
        'buy CBD vape Deutschland',
        'CBD vape juice for sale',
    ],
    'Organic Cotton': [
        'buy vape cotton Deutschland',
        'best organic vape cotton',
        '{brand} cotton for sale',
    ],
    'Chargers': [
        'buy vape battery charger Deutschland',
        'best vape charger online',
    ],
    'Charging Cables & Wall Chargers': [
        'buy vape charger Deutschland',
        'vape charging cable for sale',
    ],
    'DIY Tool': [
        'buy vape tool kit Deutschland',
        'best vape building tools',
    ],
    'Vape DIY Wire': [
        'buy vape wire Deutschland',
        '{brand} vape wire for sale',
    ],
    'Mesh Strip': [
        'buy mesh coil strips Deutschland',
        'best mesh strips for vaping',
    ],
    'Prebuilt Coil': [
        'buy prebuilt coils Deutschland',
        'best prebuilt vape coils',
    ],
    'Pre-Build DIY Coil': [
        'buy prebuilt coils Deutschland',
    ],
    'Prebuilt Wire Kit': [
        'buy prebuilt coil kit Deutschland',
    ],
    'Wax Kits': [
        'buy wax vaporizer Deutschland',
        'best wax pen vape',
    ],
    'Storage': [
        'buy vape storage case Deutschland',
        'vape battery case for sale',
    ],
    'Silicone Cases': [
        'buy vape silicone case Deutschland',
        '{brand} silicone case for sale',
    ],
    'Disposable Vape': [
        'buy disposable vape Deutschland',
        'best disposable vape online',
        'cheap disposable vape Deutschland',
    ],
    'E Hookah': [
        'buy e-hookah Deutschland',
        'electronic hookah for sale',
    ],
    'Liquid Bottle': [
        'buy empty vape bottles Deutschland',
        'vape squeeze bottles for sale',
    ],
    'DIY PG/VG': [
        'buy PG VG base Deutschland',
        'propylene glycol for vaping',
    ],
    'DIY VG': [
        'buy PG VG base Deutschland',
        'propylene glycol vape grade',
    ],
    'AIO': [
        'buy AIO vape kit Deutschland',
        'best all-in-one vape',
    ],
    'Squonk Kit': [
        'buy squonk kit Deutschland',
    ],
    'squonk tank': [
        'buy squonk tank Deutschland',
    ],
    'mech mod': [
        'buy mechanical mod Deutschland',
    ],
    'Tank O Ring': [
        'buy vape o-rings Deutschland',
    ],
    'Decks&RBA': [
        'buy RBA deck Deutschland',
    ],
    'RBA Cartdridge': [
        'buy RBA cartridge Deutschland',
    ],
    'Add-On': [
        'buy vape flavour shots Deutschland',
    ],
    'Valyrian Glass Tube': [
        'buy Valyrian replacement glass',
    ],
    'Valyrian Coil': [
        'buy Valyrian replacement coils',
    ],
    'RTA (Rebuild-able Tank Atomizer)': [
        'buy RTA atomizer Deutschland',
    ],
}

# Default for unknown types
DEFAULT_KEYWORDS = [
    'buy {title} Deutschland',
    '{brand} for sale online',
    'buy vape products Deutschland',
]


def extract_tag_value(tags, prefix):
    """Extract value from tags like 'Brand Lost Vape' -> 'Lost Vape'"""
    for tag in tags:
        if tag.startswith(prefix + ' '):
            return tag[len(prefix) + 1:].strip()
    return ''


def extract_flavour_from_tags(tags):
    """Get flavour category from tags"""
    for tag in tags:
        if tag.startswith('Flavour '):
            return tag.replace('Flavour ', '').strip()
    return ''


def extract_size_from_tags(tags):
    """Get bottle/tank size from tags"""
    for tag in tags:
        if tag.startswith('Size '):
            return tag.replace('Size ', '').strip()
    return ''


def extract_country_from_tags(tags):
    """Get country of origin"""
    for tag in tags:
        if tag.startswith('Country '):
            return tag.replace('Country ', '').strip()
    return ''


def strip_html(text):
    """Remove HTML tags and decode entities"""
    text = re.sub(r'<[^>]+>', ' ', text)
    text = html.unescape(text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def extract_specs_from_description(plain_text, product_type):
    """Pull out specs like resistance, wattage, capacity, etc."""
    specs = {}

    # Resistance
    ohm = re.findall(r'(\d+\.?\d*)\s*(?:Ω|ohm)', plain_text, re.I)
    if ohm:
        specs['resistance'] = list(set(ohm))

    # Wattage
    watts = re.findall(r'(\d+)\s*[Ww](?:att)?', plain_text)
    if watts:
        specs['wattage'] = list(set(watts))

    # Capacity
    cap = re.findall(r'(\d+\.?\d*)\s*ml', plain_text, re.I)
    if cap:
        specs['capacity'] = list(set(cap))

    # Battery
    batt = re.findall(r'(\d{3,5})\s*mAh', plain_text, re.I)
    if batt:
        specs['battery'] = list(set(batt))

    # Nicotine
    nic = re.findall(r'(\d+)\s*mg', plain_text, re.I)
    if nic:
        specs['nicotine'] = list(set(nic))

    # VG/PG
    vg = re.findall(r'(\d+)\s*(?:%|/)\s*(?:VG|PG)', plain_text, re.I)
    if vg:
        specs['vg_pg'] = list(set(vg))

    return specs


def get_transactional_keyword(product_type, brand, title, flavour=''):
    """Pick the best transactional keyword for this product"""
    pool = TRANSACTIONAL_KEYWORDS.get(product_type, DEFAULT_KEYWORDS)
    # Pick one that fits
    for kw_template in pool:
        kw = kw_template.format(
            brand=brand or 'premium',
            title=title,
            flavour=flavour or 'vape juice',
        )
        return kw
    return f'buy {title} Deutschland'


# ---------------------------------------------------------------------------
# Description builders by product type category
# ---------------------------------------------------------------------------

def normalise_type(ptype):
    """Map product types to broad categories"""
    ptype_lower = ptype.lower().strip()
    if ptype_lower in ('ejuice', 'e-juice', 'cbd', 'cbd thc', 'add-on'):
        return 'eliquid'
    if 'coil' in ptype_lower or 'cartridge' in ptype_lower or ptype_lower in ('catridge', 'coils', 'coils & cartridge', 'replacement coil', 'valyrian coil', 'rba cartdridge'):
        return 'coils'
    if 'glass' in ptype_lower or 'valyrian glass' in ptype_lower:
        return 'glass'
    if 'mod' in ptype_lower or ptype_lower in ('mods', 'box mod', 'squonk mod', 'squank mods', 'mech mod'):
        return 'mod'
    if ptype_lower in ('starter kits', 'pod kits', 'aio', 'squonk kit', 'wax kits', 'e hookah'):
        return 'kit'
    if 'tank' in ptype_lower or ptype_lower in ('rda', 'rta', 'rdta', 'rta (rebuild-able tank atomizer)', 'sub ohm tank', 'squonk tank', 'decks&rba', 'tanks'):
        return 'tank'
    if ptype_lower in ('drip tips',):
        return 'drip_tip'
    if ptype_lower in ('dry herb vaporizer',):
        return 'dry_herb'
    if ptype_lower in ('batteries',):
        return 'battery'
    if ptype_lower in ('chargers', 'charging cables & wall chargers'):
        return 'charger'
    if ptype_lower in ('organic cotton',):
        return 'cotton'
    if 'wire' in ptype_lower or 'mesh' in ptype_lower or 'prebuilt' in ptype_lower or 'pre-build' in ptype_lower:
        return 'wire'
    if ptype_lower in ('disposable vape',):
        return 'disposable'
    return 'accessory'


def build_eliquid_section(product, brand, flavour, size, country, specs, plain_existing):
    """Build enhanced description for e-liquids"""
    title = product['title']
    price = product['variants'][0].get('price', '0.00')

    # Determine flavour notes from existing description
    flavour_detail = flavour or 'premium blend'

    # Nicotine info
    nic_info = ''
    if specs.get('nicotine'):
        nics = sorted(set(specs['nicotine']), key=lambda x: int(x))
        nic_info = f'Available in {", ".join(nics)}mg nicotine strengths.'

    # VG/PG info
    ratio_info = ''
    if specs.get('vg_pg'):
        ratio_info = f'Mixed at a {"/".join(specs["vg_pg"])} VG/PG ratio for a satisfying throat hit and thick cloud production.'

    # Size info
    size_text = size or ''
    if not size_text and specs.get('capacity'):
        size_text = specs['capacity'][0] + 'ml'

    country_text = f'Made in {country}.' if country else ''

    # Grab a useful sentence from existing content if it describes flavour
    existing_flavour_line = ''
    sentences = re.split(r'[.!]', plain_existing)
    for s in sentences:
        s = s.strip()
        if len(s) > 30 and any(word in s.lower() for word in ['taste', 'flavour', 'flavor', 'blend', 'notes', 'inhale', 'exhale', 'smooth', 'refreshing', 'sweet', 'tart', 'crisp', 'juicy', 'rich', 'creamy']):
            existing_flavour_line = s.strip() + '.'
            break

    intros = [
        f"Grab a bottle of {title} and treat yourself to a proper {flavour_detail.lower()} vaping experience.",
        f"If you're after a solid {flavour_detail.lower()} vape juice, {title} delivers the goods.",
        f"{title} is one of those juices that just hits right — smooth, flavourful, and easy to keep coming back to.",
        f"Looking for your next all-day vape? {title} brings a well-rounded {flavour_detail.lower()} flavour that won't get old.",
        f"There's a reason {brand or 'this brand'} keeps turning heads — {title} is packed with genuine {flavour_detail.lower()} taste.",
    ]

    closing_lines = [
        f"Pair it with your favourite tank or pod system and you're good to go.",
        f"Works a treat in both sub-ohm tanks and pod setups.",
        f"Perfect for an all-day vape — not too overpowering, not too subtle.",
        f"Drop it in your tank, sit back, and enjoy.",
    ]

    parts = []
    parts.append(random.choice(intros))
    if existing_flavour_line:
        parts.append(existing_flavour_line)
    if nic_info:
        parts.append(nic_info)
    if ratio_info:
        parts.append(ratio_info)
    if size_text:
        parts.append(f"Comes in a {size_text} bottle.")
    if country_text:
        parts.append(country_text)
    parts.append(random.choice(closing_lines))

    return ' '.join(parts)


def build_kit_section(product, brand, specs, plain_existing):
    """Build enhanced section for kits (starter, pod, AIO)"""
    title = product['title']
    ptype = product.get('product_type', '')

    batt_info = ''
    if specs.get('battery'):
        batt_info = f"Powered by a {', '.join(specs['battery'])}mAh battery, it keeps up with your daily vaping without constant charging."

    watt_info = ''
    if specs.get('wattage'):
        w = max(int(x) for x in specs['wattage'])
        watt_info = f"Fires up to {w}W, giving you plenty of range to dial in your preferred vape."

    cap_info = ''
    if specs.get('capacity'):
        cap_info = f"The pod/tank holds {specs['capacity'][0]}ml of juice, so you spend less time refilling and more time vaping."

    intros = [
        f"The {title} is a solid pick whether you're just getting into vaping or upgrading from your current setup.",
        f"Looking for a reliable everyday vape? The {title} ticks all the right boxes.",
        f"{brand or 'This'} built the {title} for vapers who want something that just works — no fuss, no hassle.",
        f"The {title} sits comfortably in your hand and performs even better than it looks.",
    ]

    closings = [
        "Easy to use, well-built, and backed by a brand that knows what vapers actually want.",
        "Set it up, fill the pod, and you're ready to go in seconds.",
        "A quality daily driver that won't let you down.",
    ]

    parts = [random.choice(intros)]
    if batt_info:
        parts.append(batt_info)
    if watt_info:
        parts.append(watt_info)
    if cap_info:
        parts.append(cap_info)
    parts.append(random.choice(closings))

    return ' '.join(parts)


def build_mod_section(product, brand, specs, plain_existing):
    """Build enhanced section for mods"""
    title = product['title']

    watt_info = ''
    if specs.get('wattage'):
        w = max(int(x) for x in specs['wattage'])
        watt_info = f"With up to {w}W of output, it handles everything from mouth-to-lung to full-on cloud chasing."

    batt_info = ''
    if specs.get('battery'):
        batt_info = f"Runs on a {', '.join(specs['battery'])}mAh battery for all-day power."

    intros = [
        f"The {title} brings serious performance in a form factor that actually fits your pocket.",
        f"Need more power and control? The {title} from {brand or 'this brand'} delivers both without overcomplicating things.",
        f"Built for vapers who want to fine-tune their experience, the {title} gives you full control over your vape.",
    ]

    closings = [
        f"Pair it with your favourite tank or RDA and push your vape to the next level.",
        f"Solid build quality, responsive firing, and the kind of reliability you need from a daily mod.",
    ]

    parts = [random.choice(intros)]
    if watt_info:
        parts.append(watt_info)
    if batt_info:
        parts.append(batt_info)
    parts.append(random.choice(closings))

    return ' '.join(parts)


def build_coil_section(product, brand, specs, plain_existing):
    """Build enhanced section for coils and cartridges"""
    title = product['title']

    ohm_info = ''
    if specs.get('resistance'):
        ohm_info = f"Available in {', '.join(specs['resistance'])}Ω resistance options to suit your vaping style."

    watt_info = ''
    if specs.get('wattage'):
        watts = sorted(set(int(x) for x in specs['wattage']))
        if len(watts) >= 2:
            watt_info = f"Best performance between {watts[0]}-{watts[-1]}W."

    intros = [
        f"Keep your vape tasting fresh with the {title}. Nothing ruins a good setup like a burnt-out coil.",
        f"Fresh coils make all the difference. The {title} brings back that like-new flavour and vapour production.",
        f"Running low on coils? Stock up on the {title} so you're always ready.",
    ]

    closings = [
        "Swap it in, prime it for a few minutes, and you're back to full flavour.",
        "A quick coil change and your vape is running like new again.",
        "Always handy to keep a spare pack around — you'll thank yourself later.",
    ]

    parts = [random.choice(intros)]
    if ohm_info:
        parts.append(ohm_info)
    if watt_info:
        parts.append(watt_info)
    parts.append(random.choice(closings))

    return ' '.join(parts)


def build_tank_section(product, brand, specs, plain_existing):
    """Build enhanced section for tanks, RTAs, RDAs"""
    title = product['title']
    ptype = product.get('product_type', '')

    cap_info = ''
    if specs.get('capacity'):
        cap_info = f"Holds {specs['capacity'][0]}ml of e-liquid, cutting down on refills throughout the day."

    intros = [
        f"The {title} is designed for vapers who care about flavour as much as cloud production.",
        f"Upgrade your vape experience with the {title} — better airflow, better flavour, better clouds.",
        f"Whether you're a flavour chaser or a cloud chaser, the {title} has you covered.",
    ]

    closings = [
        "Top-fill design makes refilling quick and mess-free.",
        "Built to last and designed to perform — exactly what you want from a quality atomizer.",
    ]

    parts = [random.choice(intros)]
    if cap_info:
        parts.append(cap_info)
    parts.append(random.choice(closings))

    return ' '.join(parts)


def build_glass_section(product, brand, specs, plain_existing):
    """Build enhanced section for replacement glass"""
    title = product['title']

    cap_info = ''
    if specs.get('capacity'):
        cap_info = f"{specs['capacity'][0]}ml capacity."

    intros = [
        f"Accidents happen — get a replacement glass for your tank with the {title} and keep vaping without missing a beat.",
        f"Cracked your tank glass? The {title} is an exact-fit replacement so you're back up and running in no time.",
        f"Always worth keeping a spare glass handy. The {title} fits perfectly and saves you from being stuck without your vape.",
    ]

    parts = [random.choice(intros)]
    if cap_info:
        parts.append(cap_info)
    parts.append("Easy to install — just remove the old glass, slide this one on, and you're good to go.")

    return ' '.join(parts)


def build_drip_tip_section(product, brand, specs, plain_existing):
    """Build enhanced section for drip tips"""
    title = product['title']

    intros = [
        f"Swap out your drip tip for the {title} and give your vape a fresh feel.",
        f"A new drip tip can change your whole vaping experience. The {title} offers a comfortable, quality mouthpiece.",
        f"Upgrade your mouthpiece with the {title} — better comfort, better aesthetics.",
    ]

    parts = [random.choice(intros)]
    parts.append("A quick change that makes a noticeable difference to comfort and airflow.")

    return ' '.join(parts)


def build_battery_section(product, brand, specs, plain_existing):
    """Build enhanced section for batteries"""
    title = product['title']

    batt_info = ''
    if specs.get('battery'):
        batt_info = f"Rated at {specs['battery'][0]}mAh for reliable, long-lasting power."

    intros = [
        f"Keep your mod running strong with the {title}. A quality battery is the backbone of a good vape.",
        f"Don't cheap out on batteries. The {title} delivers consistent power and proper safety ratings.",
    ]

    parts = [random.choice(intros)]
    if batt_info:
        parts.append(batt_info)
    parts.append("Always use a dedicated battery charger and follow proper battery safety guidelines.")

    return ' '.join(parts)


def build_dry_herb_section(product, brand, specs, plain_existing):
    """Build enhanced section for dry herb vaporizers"""
    title = product['title']

    batt_info = ''
    if specs.get('battery'):
        batt_info = f"Built-in {specs['battery'][0]}mAh battery keeps sessions going without needing a charge mid-way."

    intros = [
        f"The {title} brings the pure flavour of your favourite herbs with precise temperature control.",
        f"For a clean, flavourful dry herb experience, the {title} from {brand or 'this brand'} gets the job done right.",
    ]

    parts = [random.choice(intros)]
    if batt_info:
        parts.append(batt_info)
    parts.append("Easy to load, easy to clean, and built to deliver consistent performance session after session.")

    return ' '.join(parts)


def build_accessory_section(product, brand, specs, plain_existing):
    """Build enhanced section for accessories, cotton, tools, etc."""
    title = product['title']

    intros = [
        f"The {title} is one of those vape accessories you'll wonder how you went without.",
        f"Keep your vape setup running smoothly with the {title}.",
        f"Every vaper needs the right gear. The {title} is a solid addition to your collection.",
    ]

    parts = [random.choice(intros)]
    parts.append("Built to last and designed for everyday use.")

    return ' '.join(parts)


def build_disposable_section(product, brand, specs, plain_existing):
    """Build enhanced section for disposable vapes"""
    title = product['title']

    intros = [
        f"The {title} is ready to vape straight out of the box — no charging, no refilling, just open and go.",
        f"Want the simplest possible vaping experience? The {title} is grab-and-go convenience at its best.",
    ]

    parts = [random.choice(intros)]
    if specs.get('capacity'):
        parts.append(f"Pre-filled with {specs['capacity'][0]}ml of juice for plenty of puffs before you need a new one.")
    parts.append("Compact enough for your pocket, flavourful enough to keep coming back for more.")

    return ' '.join(parts)


def build_charger_section(product, brand, specs, plain_existing):
    """Build enhanced section for chargers"""
    title = product['title']

    intros = [
        f"Charge your vape batteries safely and efficiently with the {title}.",
        f"A reliable charger is a must-have for any vaper. The {title} keeps your batteries topped up and ready.",
    ]

    parts = [random.choice(intros)]
    parts.append("Designed for consistent, safe charging — because proper battery care matters.")

    return ' '.join(parts)


def build_cotton_section(product, brand, specs, plain_existing):
    """Build enhanced section for organic cotton"""
    title = product['title']

    intros = [
        f"Wick your coils properly with the {title} — clean taste, quick absorption, longer coil life.",
        f"The {title} gives you that pure, uncontaminated flavour that only quality organic cotton can deliver.",
    ]

    parts = [random.choice(intros)]
    parts.append("Easy to work with and breaks in fast, so you're getting full flavour from the very first puff.")

    return ' '.join(parts)


def build_wire_section(product, brand, specs, plain_existing):
    """Build enhanced section for wire, mesh strips, prebuilt coils"""
    title = product['title']

    intros = [
        f"Build your own coils with the {title} and dial in your perfect vape.",
        f"The {title} gives advanced vapers the wire they need for custom builds.",
    ]

    parts = [random.choice(intros)]
    if specs.get('resistance'):
        parts.append(f"Resistance options available to match your preferred build style.")
    parts.append("Quality wire makes all the difference — consistent resistance, clean flavour, reliable performance.")

    return ' '.join(parts)


BUILDER_MAP = {
    'eliquid': build_eliquid_section,
    'kit': build_kit_section,
    'mod': build_mod_section,
    'coils': build_coil_section,
    'tank': build_tank_section,
    'glass': build_glass_section,
    'drip_tip': build_drip_tip_section,
    'battery': build_battery_section,
    'dry_herb': build_dry_herb_section,
    'accessory': build_accessory_section,
    'disposable': build_disposable_section,
    'charger': build_charger_section,
    'cotton': build_cotton_section,
    'wire': build_wire_section,
}


def build_seo_footer(product, brand, transactional_kw, product_type):
    """Build an SEO-optimised footer with transactional keyword and shipping info"""
    title = product['title']
    price = product['variants'][0].get('price', '0.00')

    parts = []
    parts.append(f'<p><strong>Warum bei Mr. Nice Vape kaufen?</strong> Schneller deutschlandweiter Versand bei jeder Bestellung. Jedes {title} wird aus unserem Lager in Köln verschickt – ohne Wartezeit auf internationale Lieferungen.</p>')
    parts.append(f'<p>Looking to <strong>{transactional_kw}</strong>? You\'re in the right place. Mr. Nice Vape stocks genuine {brand or "premium"} products at competitive prices.</p>')

    return '\n'.join(parts)


def enhance_product(product):
    """Main function: enhance a single product's body_html"""
    tags = product.get('tags', [])
    brand = product.get('vendor', '') or extract_tag_value(tags, 'Brand')
    flavour = extract_flavour_from_tags(tags)
    size = extract_size_from_tags(tags)
    country = extract_country_from_tags(tags)
    product_type = product.get('product_type', '')
    title = product['title']

    existing_html = product.get('body_html', '') or ''
    plain_existing = strip_html(existing_html)

    # Extract specs from existing text
    specs = extract_specs_from_description(plain_existing, product_type)

    # Also extract specs from title
    title_specs = extract_specs_from_description(title, product_type)
    for k, v in title_specs.items():
        if k not in specs:
            specs[k] = v

    # Get transactional keyword
    transactional_kw = get_transactional_keyword(product_type, brand, title, flavour)

    # Get the category and build additional content
    category = normalise_type(product_type)
    builder = BUILDER_MAP.get(category, build_accessory_section)

    # Build the new enhanced section
    enhanced_section = builder(product, brand, flavour if category == 'eliquid' else None, size if category == 'eliquid' else None, country if category == 'eliquid' else None, specs, plain_existing) if category == 'eliquid' else builder(product, brand, specs, plain_existing)

    # Build SEO footer
    seo_footer = build_seo_footer(product, brand, transactional_kw, product_type)

    # Build specs table if we have structured specs
    specs_table = build_specs_table(product, brand, specs, product_type)

    # Construct the final body_html
    # Keep the existing HTML (stripped of the old h1 to avoid duplication)
    cleaned_existing = re.sub(r'<h1[^>]*>.*?</h1>', '', existing_html, flags=re.I | re.DOTALL).strip()

    # Remove empty divs
    cleaned_existing = re.sub(r'<div>\s*</div>', '', cleaned_existing).strip()
    cleaned_existing = re.sub(r'<div>\s*&nbsp;\s*</div>', '', cleaned_existing).strip()
    cleaned_existing = re.sub(r'<p>\s*</p>', '', cleaned_existing).strip()

    new_body = f'<h2>{title}</h2>\n'
    new_body += f'<div class="product-enhanced-desc">\n<p>{enhanced_section}</p>\n</div>\n'

    if cleaned_existing:
        new_body += f'<div class="product-original-desc">\n{cleaned_existing}\n</div>\n'

    if specs_table:
        new_body += specs_table + '\n'

    new_body += seo_footer

    return new_body


def build_specs_table(product, brand, specs, product_type):
    """Build an HTML specs table from available data"""
    rows = []
    title = product['title']
    price = product['variants'][0].get('price', '0.00')

    if brand:
        rows.append(('Brand', brand))
    if product_type:
        rows.append(('Category', product_type))
    if specs.get('capacity'):
        rows.append(('Capacity', ', '.join(specs['capacity']) + 'ml'))
    if specs.get('resistance'):
        rows.append(('Resistance', ', '.join(specs['resistance']) + 'Ω'))
    if specs.get('wattage'):
        watts = sorted(set(int(x) for x in specs['wattage']))
        if len(watts) == 1:
            rows.append(('Wattage', f'{watts[0]}W'))
        else:
            rows.append(('Wattage Range', f'{watts[0]}-{watts[-1]}W'))
    if specs.get('battery'):
        rows.append(('Battery', ', '.join(specs['battery']) + 'mAh'))
    if specs.get('nicotine'):
        nics = sorted(set(int(x) for x in specs['nicotine']))
        rows.append(('Nicotine Options', ', '.join(str(n) for n in nics) + 'mg'))

    # Variant options
    options = product.get('options', [])
    for opt in options:
        if opt.get('name', '').lower() not in ('title',) and opt.get('values'):
            vals = [v for v in opt['values'] if v.lower() != 'default title']
            if vals:
                rows.append((opt['name'], ', '.join(vals[:10])))

    if not rows:
        return ''

    table = '<div class="product-specs">\n<h3>Specifications</h3>\n<table>\n'
    for label, value in rows:
        table += f'  <tr><td><strong>{label}</strong></td><td>{value}</td></tr>\n'
    table += '</table>\n</div>'

    return table


def main():
    # Set seed for reproducibility within a run but variation between products
    random.seed(42)

    with open(PRODUCTS_FILE, 'r') as f:
        products = json.load(f)

    print(f'Processing {len(products)} products...')

    enhanced_count = 0
    for i, product in enumerate(products):
        try:
            product['body_html'] = enhance_product(product)
            enhanced_count += 1
        except Exception as e:
            print(f'  ERROR on product {i} ({product.get("title", "?")}): {e}')

        if (i + 1) % 100 == 0:
            print(f'  Processed {i + 1}/{len(products)}...')

    # Write back
    with open(PRODUCTS_FILE, 'w') as f:
        json.dump(products, f, indent=2, ensure_ascii=False)

    print(f'Done! Enhanced {enhanced_count}/{len(products)} products.')
    print(f'Output written to {PRODUCTS_FILE}')


if __name__ == '__main__':
    main()
