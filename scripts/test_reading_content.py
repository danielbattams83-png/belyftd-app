import tempfile
import unittest
from pathlib import Path
from zipfile import ZipFile
from reading_content import clean_content, extract_reading_document

class ReadingContentTests(unittest.TestCase):
    def test_worksheet_footers_and_rules(self):
        for footer in ['My to do list:', 'My TO-DO LIST this week:', 'My Goals today are:', 'Notes:']:
            self.assertEqual(clean_content(f'Read this.\n{footer}\nhttps://loom.com/share/example\n-----'), 'Read this.')
        self.assertEqual(clean_content('Keep-----these_____words.\nhttps://loom.com/share/example'), 'Keep these words.')

    def test_tags_and_acronyms(self):
        self.assertEqual(clean_content('[Tone: Warm] H-stands for hope. Hstands for hope.'), 'H - stands for hope. H - stands for hope.')
        self.assertEqual(clean_content('Hello[warm tone]world'), 'Hello world')

    def test_original_word_runs_and_paragraphs(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'original.docx'
            with ZipFile(path, 'w') as archive:
                archive.writestr('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hope</w:t></w:r><w:r><w:t>ful</w:t><w:br/><w:t>H-stands for hope.</w:t></w:r></w:p><w:p><w:r><w:t>Next paragraph.</w:t></w:r></w:p></w:body></w:document>')
            self.assertEqual(extract_reading_document(path), 'Hopeful\nH - stands for hope.\n\nNext paragraph.')

    def test_rejects_narration_source_before_opening(self):
        with self.assertRaisesRegex(ValueError, 'Narration scripts'):
            extract_reading_document(Path('Scripts/script_elevenlabs.docx'))

if __name__ == '__main__':
    unittest.main()
