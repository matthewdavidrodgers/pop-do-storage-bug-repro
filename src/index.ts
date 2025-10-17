import { DurableObject } from 'cloudflare:workers';

export class MyDurableObject extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	async writeToKV() {
		await this.env.MY_KV_NAMESPACE.put('some-key', 'some-value');
	}
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const stub = env.MY_DURABLE_OBJECT.getByName('foo');

		try {
			await stub.writeToKV();
		} catch (err) {
			return new Response((err as Error).message, { status: 500 });
		}

		return new Response('OK');
	},
} satisfies ExportedHandler<Env>;
