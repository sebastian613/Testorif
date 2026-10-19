"""Offline regression checks for legacy cache permission assumptions."""
import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('builder', pathlib.Path(__file__).parents[1] / 'scripts/build_mishneh_torah.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

class SourcePermissionsTests(unittest.TestCase):
    def test_tagged_public_domain_is_accepted(self):
        builder.validate_permissions([{'name': 'Known edition', 'tagged': True, 'license': 'Public Domain'}])

    def test_legacy_untagged_claim_is_rejected_even_with_matching_edition(self):
        with self.assertRaisesRegex(RuntimeError, 'Unresolved source permissions'):
            builder.validate_permissions([
                {'name': 'Known edition', 'tagged': True, 'license': 'Public Domain', 'versionTitle': 'Torat Emet 370'},
                {'name': 'Unverified edition', 'tagged': False, 'license': 'Public Domain (untagged by Sefaria on this treatise)', 'versionTitle': 'Torat Emet 370'},
            ])

    def test_direct_download_legacy_public_domain_claim_is_rejected(self):
        for title in builder.MECHON_MAMRE_DIRECT:
            with self.assertRaises(RuntimeError):
                builder.validate_permissions([{'name': title, 'tagged': True, 'license': 'Public Domain'}])

    def test_unknown_license_is_rejected(self):
        with self.assertRaises(RuntimeError):
            builder.validate_permissions([{'name': 'Unknown edition', 'tagged': True, 'license': 'unknown'}])

if __name__ == '__main__':
    unittest.main()
