import {IData, ILogParam} from "@/types";
import {fetcher} from "./Fetcher";

const path = {
  logs: "/logs",
};

function getLogs(params: ILogParam): Promise<IData> {
  return fetcher({
    url: path.logs,
    method: "GET",
    params,
  });
}

export default {
  getLogs,
};
