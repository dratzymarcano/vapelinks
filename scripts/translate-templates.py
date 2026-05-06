#!/usr/bin/env python3
"""
Context-aware EN->DE translator for Astro templates.

Strategy:
  - Split each .astro file into frontmatter (between leading --- pairs) and body.
  - Frontmatter is JS/TS — translate ONLY inside string literals that look like UI text:
      * Strings containing whitespace AND likely English words.
      * BUT only if they're being passed as title / description / label / etc.
      * Conservative: only translate strings that are entirely a UI phrase from our dictionary.
  - Body is mixed HTML + Astro expressions:
      * Translate text outside `<script>`, `<style>`, `{...}` JS expressions, and HTML attribute values
        EXCEPT for these safe attributes: alt, title, placeholder, aria-label, content (when meta name is description/og:title/og:description),
        button text inner, label text inner, etc.
      * We DO translate the text between tags.
      * We do NOT translate inside `<script>...</script>` or `<style>...</style>`.
      * We do NOT translate the contents of {expressions}.
"""
import re, sys, os, glob, json, html

# ============== UI phrase dictionary ==============
# Order matters: longer phrases first within each section.
PHRASES = [
    # Long marketing phrases (place first)
    ("Standard & Express shipping deutschlandweit", "Standard- & Express-Versand deutschlandweit"),
    ("Standard & Express shipping", "Standard- & Express-Versand"),
    ("Browse genuine vape products online at Mr. Nice Vape Deutschland.", "Entdecke originale Vape-Produkte online bei Mr. Nice Vape Deutschland."),
    ("Shop genuine vape products online at Mr. Nice Vape Deutschland.", "Kaufe originale Vape-Produkte online bei Mr. Nice Vape Deutschland."),
    ("Deutschlands #1 Online Vape Shop", "Deutschlands #1 Online-Vape-Shop"),
    ("Deutschlands favourite vape shop", "Deutschlands beliebtester Vape-Shop"),
    ("Deutschlands beliebtester vape shop", "Deutschlands beliebtester Vape-Shop"),
    ("18+ only — Age verification required", "Nur 18+ — Altersüberprüfung erforderlich"),
    ("18+ only", "Nur 18+"),
    ("Age verification required", "Altersüberprüfung erforderlich"),
    ("Köln, NRW — deutschlandweit shipping", "Köln, NRW — Versand deutschlandweit"),
    ("Köln, NRW — deutschlandweit Versand", "Köln, NRW — Versand deutschlandweit"),
    ("Browse all collections", "Alle Kategorien ansehen"),
    ("All collections →", "Alle Kategorien →"),
    ("All collections", "Alle Kategorien"),
    ("Track My Orders", "Meine Bestellungen verfolgen"),
    ("Track Order", "Bestellung verfolgen"),
    ("Add to Cart", "In den Warenkorb"),
    ("Add to cart", "In den Warenkorb"),
    ("View Cart", "Warenkorb ansehen"),
    ("Your Cart", "Dein Warenkorb"),
    ("Your cart is empty", "Dein Warenkorb ist leer"),
    ("Cart is empty", "Warenkorb ist leer"),
    ("Clear Cart", "Warenkorb leeren"),
    ("Continue Shopping", "Weiter einkaufen"),
    ("Browse Products", "Produkte ansehen"),
    ("Shop All", "Alles ansehen"),
    ("Shop all", "Alles ansehen"),
    ("Shop Now", "Jetzt einkaufen"),
    ("Read more", "Weiterlesen"),
    ("Read More", "Weiterlesen"),
    ("Learn more", "Mehr erfahren"),
    ("Learn More", "Mehr erfahren"),
    ("View all", "Alle ansehen"),
    ("View All", "Alle ansehen"),
    ("See all", "Alle ansehen"),
    ("See All", "Alle ansehen"),
    ("Proceed to Checkout", "Zur Kasse gehen"),
    ("Place Order", "Bestellung aufgeben"),
    ("Send Message", "Nachricht senden"),
    ("Account Login", "Konto-Anmeldung"),
    ("Sign in", "Anmelden"),
    ("Sign In", "Anmelden"),
    ("Sign up", "Registrieren"),
    ("Sign Up", "Registrieren"),
    ("Sign out", "Abmelden"),
    ("Log in", "Anmelden"),
    ("Log In", "Anmelden"),
    ("Log out", "Abmelden"),
    ("My Account", "Mein Konto"),
    ("My Orders", "Meine Bestellungen"),
    ("Order Number", "Bestellnummer"),
    ("Order Date", "Bestelldatum"),
    ("Order Total", "Bestellsumme"),
    ("Order Status", "Bestellstatus"),
    ("Order Confirmation", "Bestellbestätigung"),
    ("Order Summary", "Bestellübersicht"),
    ("Order Details", "Bestelldetails"),
    ("Order Notes", "Anmerkungen zur Bestellung"),
    ("Thank you for your order", "Vielen Dank für deine Bestellung"),
    ("Thank You", "Vielen Dank"),
    ("Thank you", "Vielen Dank"),
    ("First Name", "Vorname"),
    ("Last Name", "Nachname"),
    ("Full Name", "Vollständiger Name"),
    ("Email Address", "E-Mail-Adresse"),
    ("Phone Number", "Telefonnummer"),
    ("Street Address", "Straße"),
    ("Apartment, suite, etc.", "Wohnung, Apartment usw."),
    ("Postal code", "Postleitzahl"),
    ("Postcode", "PLZ"),
    ("Zip code", "PLZ"),
    ("Confirm Password", "Passwort bestätigen"),
    ("Forgot password?", "Passwort vergessen?"),
    ("Remember me", "Angemeldet bleiben"),
    ("In stock", "Auf Lager"),
    ("In Stock", "Auf Lager"),
    ("Out of stock", "Nicht auf Lager"),
    ("Out of Stock", "Nicht auf Lager"),
    ("Sold out", "Ausverkauft"),
    ("Sold Out", "Ausverkauft"),
    ("Best Seller", "Bestseller"),
    ("Best seller", "Bestseller"),
    ("Best Sellers", "Bestseller"),
    ("Best sellers", "Bestseller"),
    ("Featured products", "Empfohlene Produkte"),
    ("Featured Products", "Empfohlene Produkte"),
    ("Related products", "Ähnliche Produkte"),
    ("Related Products", "Ähnliche Produkte"),
    ("You may also like", "Das könnte dir auch gefallen"),
    ("Recently viewed", "Zuletzt angesehen"),
    ("Sort by", "Sortieren nach"),
    ("Sort By", "Sortieren nach"),
    ("Clear filters", "Filter zurücksetzen"),
    ("Clear Filters", "Filter zurücksetzen"),
    ("Open search", "Suche öffnen"),
    ("Close search", "Suche schließen"),
    ("Open cart", "Warenkorb öffnen"),
    ("Close cart", "Warenkorb schließen"),
    ("Open menu", "Menü öffnen"),
    ("Close menu", "Menü schließen"),
    ("Search results", "Suchergebnisse"),
    ("Search Results", "Suchergebnisse"),
    ("No results found", "Keine Ergebnisse gefunden"),
    ("No results", "Keine Ergebnisse"),
    ("Search products, brands, collections…", "Produkte, Marken, Kategorien suchen…"),
    ("Search products, brands, collections", "Produkte, Marken, Kategorien suchen"),
    ("Search products", "Produkte suchen"),
    ("Free shipping", "Kostenloser Versand"),
    ("Free Shipping", "Kostenloser Versand"),
    ("Express shipping", "Express-Versand"),
    ("Standard shipping", "Standard-Versand"),
    ("Minimum order", "Mindestbestellung"),
    ("Min order", "Mindestbestellung"),
    ("Min Order", "Mindestbestellung"),
    ("Quick Links", "Schnelllinks"),
    ("Get in Touch", "Kontakt aufnehmen"),
    ("All rights reserved", "Alle Rechte vorbehalten"),
    ("Shipping Policy", "Versandbedingungen"),
    ("Refund Policy", "Rückgaberecht"),
    ("Privacy Policy", "Datenschutzerklärung"),
    ("Terms & Conditions", "AGB"),
    ("Terms and Conditions", "AGB"),
    ("Cookies Policy", "Cookie-Richtlinie"),
    ("Cookie Policy", "Cookie-Richtlinie"),
    ("About Us", "Über uns"),
    ("Contact Us", "Kontakt"),
    ("Main navigation", "Hauptnavigation"),
    ("Mobile navigation", "Mobile Navigation"),
    ("Age Verification", "Altersüberprüfung"),
    ("I'm 18+", "Ich bin 18+"),
    ("Accept All", "Alle akzeptieren"),
    ("Loading...", "Lädt…"),
    ("Loading…", "Lädt…"),
    ("Customer Reviews", "Kundenbewertungen"),
    ("Write a review", "Bewertung schreiben"),
    ("Write a Review", "Bewertung schreiben"),
    ("Verified Purchase", "Verifizierter Kauf"),
    ("Free Returns", "Kostenlose Rücksendung"),
    ("Secure Checkout", "Sicherer Bezahlvorgang"),
    ("Customer Support", "Kundenservice"),
    ("Reset Password", "Passwort zurücksetzen"),
    ("Create an account", "Konto erstellen"),
    ("Create Account", "Konto erstellen"),
    ("Already have an account?", "Hast du bereits ein Konto?"),
    ("Don't have an account?", "Noch kein Konto?"),
    ("Page not found", "Seite nicht gefunden"),
    ("Page Not Found", "Seite nicht gefunden"),
    ("Back to Home", "Zurück zur Startseite"),
    ("Back to home", "Zurück zur Startseite"),
    ("Go Home", "Zur Startseite"),
    ("Newsletter", "Newsletter"),
    ("Subscribe to our newsletter", "Newsletter abonnieren"),
    ("Sign up for our newsletter", "Newsletter abonnieren"),
    ("Enter your email", "E-Mail-Adresse eingeben"),
    ("Your Email", "Deine E-Mail"),
    ("Latest Posts", "Neueste Beiträge"),
    ("Latest from the blog", "Neueste Beiträge aus dem Blog"),
    ("Read article", "Artikel lesen"),
    ("Min. read", "Min. Lesezeit"),
    ("min read", "Min. Lesezeit"),
    # Single-word entries (after phrases)
    ("Home", "Startseite"),
    ("Shop", "Shop"),
    ("Collections", "Kategorien"),
    ("Blog", "Blog"),
    ("About", "Über uns"),
    ("Contact", "Kontakt"),
    ("Search", "Suche"),
    ("Cart", "Warenkorb"),
    ("Checkout", "Zur Kasse"),
    ("Account", "Konto"),
    ("Menu", "Menü"),
    ("Total", "Gesamt"),
    ("Subtotal", "Zwischensumme"),
    ("Shipping", "Versand"),
    ("Tax", "MwSt."),
    ("Taxes", "Steuern"),
    ("Discount", "Rabatt"),
    ("Quantity", "Menge"),
    ("Price", "Preis"),
    ("Brand", "Marke"),
    ("Brands", "Marken"),
    ("Filter", "Filter"),
    ("Filters", "Filter"),
    ("Sale", "Sale"),
    ("Clearance", "Ausverkauf"),
    ("Featured", "Empfohlen"),
    ("Showing", "Es werden"),
    ("Previous", "Zurück"),
    ("Next", "Weiter"),
    ("Page", "Seite"),
    ("Information", "Informationen"),
    ("Privacy", "Datenschutz"),
    ("Terms", "AGB"),
    ("Refunds", "Rückgaben"),
    ("Help", "Hilfe"),
    ("Support", "Support"),
    ("Submit", "Absenden"),
    ("Send", "Senden"),
    ("Subscribe", "Abonnieren"),
    ("Register", "Registrieren"),
    ("Login", "Anmelden"),
    ("Logout", "Abmelden"),
    ("Welcome", "Willkommen"),
    ("Hello", "Hallo"),
    ("Yes", "Ja"),
    ("No", "Nein"),
    ("Close", "Schließen"),
    ("Open", "Öffnen"),
    ("Loading", "Lädt"),
    ("Success", "Erfolg"),
    ("Error", "Fehler"),
    ("Sorry", "Entschuldigung"),
    ("Required", "Erforderlich"),
    ("Optional", "Optional"),
    ("Email", "E-Mail"),
    ("Phone", "Telefon"),
    ("Message", "Nachricht"),
    ("Subject", "Betreff"),
    ("Address", "Adresse"),
    ("City", "Stadt"),
    ("State", "Bundesland"),
    ("Country", "Land"),
    ("Password", "Passwort"),
    ("FAQ", "FAQ"),
    ("Exit", "Verlassen"),
    ("Dismiss", "Schließen"),
    ("New", "Neu"),
    ("Reviews", "Bewertungen"),
    ("Review", "Bewertung"),
    ("Rating", "Bewertung"),
    ("Description", "Beschreibung"),
    ("Details", "Details"),
    ("Specifications", "Spezifikationen"),
    ("Features", "Eigenschaften"),
    ("Vendor", "Hersteller"),
    ("Type", "Typ"),
    ("SKU", "Artikelnummer"),
    ("Tags", "Tags"),
    ("Share", "Teilen"),
    ("Save", "Speichern"),
    ("Edit", "Bearbeiten"),
    ("Delete", "Löschen"),
    ("Update", "Aktualisieren"),
    ("Apply", "Anwenden"),
    ("Reset", "Zurücksetzen"),
    ("Cancel", "Abbrechen"),
    ("Confirm", "Bestätigen"),
    ("Continue", "Fortfahren"),
    ("Back", "Zurück"),
    ("Pay", "Bezahlen"),
    ("Order", "Bestellung"),
    ("Orders", "Bestellungen"),
    ("Date", "Datum"),
    ("Status", "Status"),
    ("Payment", "Zahlung"),
    ("Method", "Methode"),
    ("Notes", "Anmerkungen"),
    ("Categories", "Kategorien"),
    ("Category", "Kategorie"),
    ("Author", "Autor"),
    ("Posted on", "Veröffentlicht am"),
    ("Published", "Veröffentlicht"),
    ("Tags:", "Tags:"),
    ("Articles", "Artikel"),
    ("Article", "Artikel"),
]

def translate_text(text):
    """Translate plain English text to German using the dictionary."""
    if not text or not text.strip():
        return text
    out = text
    for en, de in PHRASES:
        # Case-insensitive whole-phrase replacement preserving surrounding ws.
        # Use word-boundary style; for phrases starting/ending with non-word chars use literal.
        if re.match(r'^\w', en) and re.search(r'\w$', en):
            pat = r'\b' + re.escape(en) + r'\b'
        else:
            pat = re.escape(en)
        out = re.sub(pat, lambda m: de, out)
    return out


# ====== Astro file processing ======

def split_frontmatter(src):
    """Return (frontmatter, body, prefix, suffix) where prefix/suffix include the --- markers."""
    m = re.match(r'^(---\s*\n)(.*?\n)(---\s*\n)', src, re.DOTALL)
    if m:
        return m.group(2), src[m.end():], m.group(1), m.group(3)
    return None, src, '', ''


def process_body(body):
    """Walk the HTML body, translating text nodes outside scripts/styles/expressions/attributes."""
    out = []
    i = 0
    n = len(body)
    # Stack of "do not translate inside" tags
    while i < n:
        # Skip <script> and <style> blocks entirely
        m = re.match(r'<(script|style)\b[^>]*>', body[i:], re.IGNORECASE)
        if m:
            tag = m.group(1)
            end = re.search(r'</' + tag + r'\s*>', body[i:], re.IGNORECASE)
            if end:
                out.append(body[i:i + end.end()])
                i += end.end()
                continue
            else:
                out.append(body[i:])
                break
        # HTML comment
        if body.startswith('<!--', i):
            end = body.find('-->', i)
            if end == -1:
                out.append(body[i:]); break
            out.append(body[i:end+3]); i = end+3; continue
        # Tag open
        if body[i] == '<':
            # find end of tag, but be careful of attr values containing >
            j = i + 1
            in_str = None
            while j < n:
                c = body[j]
                if in_str:
                    if c == in_str:
                        in_str = None
                    elif c == '\\':
                        j += 1
                elif c == '"' or c == "'":
                    in_str = c
                elif c == '{':
                    # Astro/JSX expression inside tag attribute or content - skip braces matching
                    depth = 1
                    j += 1
                    while j < n and depth > 0:
                        cc = body[j]
                        if cc == '{': depth += 1
                        elif cc == '}': depth -= 1
                        j += 1
                    continue
                elif c == '>':
                    j += 1
                    break
                j += 1
            tag_text = body[i:j]
            # Translate selected attribute values inside the tag
            tag_text = translate_attrs(tag_text)
            out.append(tag_text)
            i = j
            continue
        # Astro expression in body
        if body[i] == '{':
            depth = 1
            j = i + 1
            while j < n and depth > 0:
                if body[j] == '{': depth += 1
                elif body[j] == '}': depth -= 1
                j += 1
            out.append(body[i:j])
            i = j
            continue
        # Plain text run
        j = i
        while j < n and body[j] not in '<{':
            j += 1
        text = body[i:j]
        out.append(translate_text(text))
        i = j
    return ''.join(out)


SAFE_ATTRS = ('alt','title','placeholder','aria-label','aria-description','data-tooltip','label')

def translate_attrs(tag_text):
    # Translate values of safe attributes when they are simple string literals.
    def repl(m):
        name = m.group(1).lower()
        quote = m.group(2)
        val = m.group(3)
        # don't touch attribute values that contain Astro expression delimiters or template literals
        if '{' in val or '`' in val:
            return m.group(0)
        new = translate_text(val)
        return f'{name}={quote}{new}{quote}'
    pattern = re.compile(r'\b(' + '|'.join(re.escape(a) for a in SAFE_ATTRS) + r')=(["\'])(.*?)\2', re.IGNORECASE | re.DOTALL)
    return pattern.sub(repl, tag_text)


def process_frontmatter(fm):
    """Translate ONLY string literals passed to specific known props/keys.
    Targets: title:, description:, label:, placeholder:, alt:, ariaLabel:, message:.
    Also translate strings in: title="..." within Layout component invocations (handled by body processor).
    """
    # Match key: 'string' or key: "string"  (single-line literal only)
    keys = ('title','description','label','placeholder','alt','ariaLabel','aria-label','message','heading','subtitle','tagline','seoTitle','siteTitle','metaDescription')
    key_re = re.compile(r'(\b(?:' + '|'.join(keys) + r')\s*[:=]\s*)(["\'])((?:(?!\2).)*)\2')
    def r1(m):
        prefix, q, val = m.group(1), m.group(2), m.group(3)
        if '${' in val or '\\' in val: return m.group(0)
        new = translate_text(val)
        return f'{prefix}{q}{new}{q}'
    return key_re.sub(r1, fm)


def process_astro(path):
    src = open(path, encoding='utf-8').read()
    fm, body, p_open, p_close = split_frontmatter(src)
    if fm is not None:
        fm2 = process_frontmatter(fm)
    else:
        fm2 = fm
    body2 = process_body(body)
    new_src = (p_open + fm2 + p_close + body2) if fm is not None else body2
    if new_src != src:
        open(path,'w',encoding='utf-8').write(new_src)
        return True
    return False


def main():
    files = sorted(glob.glob('src/**/*.astro', recursive=True))
    changed = 0
    for f in files:
        if process_astro(f):
            print('translated', f)
            changed += 1
    print('Done. files changed:', changed)

if __name__ == '__main__':
    main()
