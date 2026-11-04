import {describe,it,expect} from 'vitest';
import {createSessionId} from '../../src/game/session-id';
describe('anonymous IDs support mobile contexts without randomUUID',()=>{
  it('generates valid distinct v4 IDs using getRandomValues fallback',()=>{
    const source={getRandomValues:crypto.getRandomValues.bind(crypto)};
    const ids=Array.from({length:100},()=>createSessionId(source));expect(new Set(ids).size).toBe(100);
    for(const id of ids)expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  });
});
