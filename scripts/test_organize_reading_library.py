import csv
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location('organize_reading', Path(__file__).with_name('organize-reading-library.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class ReadingOrganizationTests(unittest.TestCase):
    def test_variants_exercises_supplements_and_references_are_preserved(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            index = root / 'Clean Audio Texts'
            index.mkdir()
            for name in ['Lesson.docx', 'Variant.docx', 'Extra.docx', 'Reference.docx']:
                with ZipFile(root / name, 'w') as archive:
                    archive.writestr('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>[Tone: Warm] H-stands for hope. Workshop: Reflect on your goals.</w:t></w:r></w:p></w:body></w:document>')
            with (index / 'module_session_index.csv').open('w', newline='', encoding='utf-8') as handle:
                writer = csv.DictWriter(handle, fieldnames=['module', 'course', 'session', 'title', 'sources'])
                writer.writeheader()
                writer.writerow({'module': 1, 'course': 'Mindset', 'session': 1, 'title': 'Hope', 'sources': 'Lesson.docx; Variant.docx'})
            with (index / 'source_manifest.csv').open('w', newline='', encoding='utf-8') as handle:
                writer = csv.DictWriter(handle, fieldnames=['source', 'output'])
                writer.writeheader()
                for source, output in [('Lesson.docx', '01 - Mindset/Lesson.txt'), ('Variant.docx', '01 - Mindset/Variant.txt'), ('Extra.docx', '_Additional Library Lessons/Extra.txt'), ('Reference.docx', '_Reference Documents/Reference.txt')]:
                    writer.writerow({'source': source, 'output': output})
            exports, units, originals, summary = module.plan_library(root, index)
            self.assertEqual(len(originals), 4)
            self.assertEqual(len(units), 2)
            self.assertEqual(summary['referenceDocuments'], 1)
            self.assertTrue(summary['allTextTagFree'])
            self.assertIn('Workshop: Reflect on your goals.', units[0]['content'])
            self.assertIn('Reading version 2', units[0]['content'])
            self.assertEqual(len(units[0]['variants']), 2)
            self.assertTrue(units[1]['supplemental'])
            self.assertTrue(any(path.parts[0] == '_Reference Documents' for path in exports))
            self.assertIn(Path('source_manifest.csv'), exports)

if __name__ == '__main__': unittest.main()
