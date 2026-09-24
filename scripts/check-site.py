#!/usr/bin/env python3
"""Check that local HTML links and referenced assets exist (stdlib only)."""

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import sys

ROOT = Path(__file__).resolve().parents[1]
PAGES = sorted(ROOT.glob('*.html'))


class PageLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.add(attrs['id'])
        if tag == 'a' and attrs.get('name'):
            self.ids.add(attrs['name'])
        for key in ('href', 'src'):
            if attrs.get(key):
                self.links.append((tag, key, attrs[key]))


def check():
    pages = {}
    for page in PAGES:
        parsed = PageLinks()
        parsed.feed(page.read_text(encoding='utf-8'))
        pages[page] = parsed

    errors = []
    for page, parsed in pages.items():
        for tag, key, value in parsed.links:
            target = urlsplit(value)
            if value == '#' or target.scheme == 'javascript':
                errors.append(f'{page.name}: placeholder link {value!r}')
                continue
            if target.scheme or target.netloc or value.startswith('//'):
                continue  # External destinations are outside this offline check.
            path = unquote(target.path)
            target_file = (ROOT / path.lstrip('/')) if path.startswith('/') else (page.parent / path)
            if not path or path.endswith('/'):
                target_file /= 'index.html' if path.endswith('/') else page.name
            # Resolve and reject references that escape this GitHub Pages site.
            target_file = target_file.resolve()
            if not target_file.is_relative_to(ROOT):
                errors.append(f'{page.name}: outside site: {value!r}')
            elif not target_file.is_file():
                errors.append(f'{page.name}: missing {tag} {key}={value!r}')
            elif target.fragment and target_file in pages and unquote(target.fragment) not in pages[target_file].ids:
                errors.append(f'{page.name}: missing anchor {value!r}')
    return errors, len(PAGES)


if __name__ == '__main__':
    issues, count = check()
    if issues:
        print('\n'.join(issues), file=sys.stderr)
        sys.exit(1)
    print(f'Checked local links and assets across {count} HTML pages')
