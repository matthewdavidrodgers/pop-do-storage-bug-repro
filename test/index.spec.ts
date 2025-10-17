import { env, SELF, runInDurableObject } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';

describe('repro', () => {
	class KVMock {
		activeWrites = 0;
		alwaysFail = false;

		async put(key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream): Promise<void> {
			if (this.alwaysFail || this.activeWrites > 0) {
				throw new Error('KV PUT failed');
			}
			this.activeWrites++;

			// simulate async operation
			await new Promise((resolve) => {
				setTimeout(resolve, 10);
			});

			this.activeWrites--;
		}
	}

	it('should write concurrently to kv', async () => {
		const kvMock = new KVMock();

		const id = env.MY_DURABLE_OBJECT.idFromName('foo');
		const stub = env.MY_DURABLE_OBJECT.get(id);
		await runInDurableObject(stub, (instance) => {
			(instance as any).env.MY_KV_NAMESPACE = kvMock;
		});

		const [responseA, responseB] = await Promise.all([SELF.fetch('http://worker'), SELF.fetch('http://worker')]);

		// one should succeed, the other should fail
		expect((responseA.status === 200 && responseB.status === 500) || (responseA.status === 500 && responseB.status === 200)).toBe(true);
	});
});
