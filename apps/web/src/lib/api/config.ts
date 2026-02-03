import axios from "axios";

export type SaveConfigResponse = { ok: true } | { ok: false; error: string };

export const saveConfig = async (
  convexUrl: string,
): Promise<SaveConfigResponse> => {
  const { data } = await axios.post<SaveConfigResponse>("/api/config", {
    convexUrl,
  });
  return data;
};
