export const rateLimit = (max: number, timeWindow: string = "1 minute") => ({
  config: {
    rateLimit: {
      max,
      timeWindow,
    },
  },
});
