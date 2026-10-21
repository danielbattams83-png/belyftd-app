"""Reading text extraction, independent of narration/ElevenLabs processing."""
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from zipfile import ZipFile


def clean_content(text):
    while re.search(r'\[[^\[\]]*\]', text):
        text = re.sub(r'\[[^\[\]]*\]', ' ', text)
    text = text.replace('\xa0', ' ')
    text = re.sub(r'\b([A-Z])[ \t]*[-\u2013\u2014][ \t]*(?=\S)', r'\1 - ', text)
    text = re.sub(r'\b([A-Z])(?=stands?\s+for\b)', r'\1 - ', text)
    text = re.sub(r'[ \t]+', ' ', text)
    return re.sub(r'\n{3,}', '\n\n', '\n'.join(line.strip() for line in text.splitlines())).strip()


def extract_reading_document(source):
    source = Path(source)
    if any(re.fullmatch(r'scripts?|narration|elevenlabs', part, re.I) for part in source.parts) or 'script_elevenlabs' in source.name.lower():
        raise ValueError('Narration scripts cannot be used as reading sources.')
    with ZipFile(source) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
    namespace = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
    paragraphs = []
    for paragraph in root.iter(namespace + 'p'):
        # Word splits a word into formatting runs; concatenate runs verbatim.
        # Preserve explicit paragraph, tab, and line-break boundaries.
        parts = []
        for node in paragraph.iter():
            if node.tag == namespace + 't':
                parts.append(node.text or '')
            elif node.tag == namespace + 'tab':
                parts.append(' ')
            elif node.tag in [namespace + 'br', namespace + 'cr']:
                parts.append('\n')
        paragraphs.append(''.join(parts))
    text = clean_content('\n\n'.join(paragraphs))
    if not text or '[' in text or ']' in text:
        raise ValueError('Reading source is empty or contains malformed direction tags.')
    return text
