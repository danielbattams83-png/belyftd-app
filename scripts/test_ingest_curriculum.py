import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile

spec = importlib.util.spec_from_file_location('ingest_curriculum', Path(__file__).with_name('ingest-curriculum.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class CurriculumIngestionTests(unittest.TestCase):
    def test_discovers_docx_and_json_without_requiring_any_media(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            master = root / 'MODULE-1' / 'Master Files' / 'LL-1.2-(HOPE).docx'
            master.parent.mkdir(parents=True)
            with ZipFile(master, 'w') as archive:
                archive.writestr('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>H-stands for hope.</w:t></w:r></w:p></w:body></w:document>')
            data = root / 'module-3' / 'unit-10' / 'text.json'
            data.parent.mkdir(parents=True)
            data.write_text(json.dumps({'content': '[warm tone] Read this unit.', 'contentKind': 'reading'}))
            script = root / 'MODULE-1' / 'Scripts' / '1.2-HOPE.docx'
            script.parent.mkdir()
            script.write_text('Never ingest this narration source')
            sources, excluded = module.discover_sources(root)
            self.assertEqual(set(sources), {'modules/module-1/units/unit-2', 'modules/module-3/units/unit-10'})
            self.assertEqual(excluded, 1)
            self.assertEqual(module.extract_source(master)[0], 'H - stands for hope.')
            self.assertEqual(module.extract_source(data)[0], 'Read this unit.')

    def test_rejects_unmapped_documents_and_narration_json(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'unmapped.docx').write_text('unknown')
            with self.assertRaisesRegex(ValueError, 'Unmapped'):
                module.discover_sources(root)
            data = root / '1.1-script.json'
            data.write_text(json.dumps({'contentKind': 'narration', 'content': 'Do not read'}))
            with self.assertRaisesRegex(ValueError, 'Not reading JSON'):
                module.extract_source(data)

if __name__ == '__main__': unittest.main()
