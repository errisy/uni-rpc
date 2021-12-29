from absl.testing import absltest
from lambda_entry import handler
import asyncio


class LambdaEntryTest(absltest.TestCase):
    def test_handler(self):
        print(asyncio.run(handler({})))


if __name__ == '__main__':
    absltest.main()
