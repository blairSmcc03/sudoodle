import { handleRequest } from "./handler";
import { d1ResultStore, type D1Like } from "./d1Store";

interface Env {
  DB: D1Like;
  TOKEN_HER: string;
  TOKEN_HIM: string;
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return handleRequest(request, {
      store: d1ResultStore(env.DB),
      tokens: { her: env.TOKEN_HER, him: env.TOKEN_HIM },
      now: () => new Date(),
    });
  },
};
