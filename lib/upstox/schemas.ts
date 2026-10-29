import { z } from "zod";

export const UpstoxQuotesResponseSchema = z.object({
  status: z.string(),
  data: z.record(z.string(), z.record(z.string(), z.any())).optional(),
});

export const UpstoxCandlesResponseSchema = z.object({
  status: z.string(),
  data: z.object({
    candles: z.array(z.array(z.union([z.string(), z.number()]))),
  }),
});

export const UpstoxOptionChainResponseSchema = z.object({
  status: z.string().optional(),
  data: z
    .array(
      z
        .object({
          expiry: z.string().optional(),
          pcr: z.number().nullable().optional(),
          strike_price: z.number(),
          underlying_key: z.string().optional(),
          underlying_spot_price: z.number().nullable().optional(),
          call_options: z
            .object({
              instrument_key: z.string().optional(),
              market_data: z
                .object({
                  ltp: z.number().nullable().optional(),
                  volume: z.number().nullable().optional(),
                  oi: z.number().nullable().optional(),
                  close_price: z.number().nullable().optional(),
                  bid_price: z.number().nullable().optional(),
                  bid_qty: z.number().nullable().optional(),
                  ask_price: z.number().nullable().optional(),
                  ask_qty: z.number().nullable().optional(),
                  prev_oi: z.number().nullable().optional(),
                })
                .nullable()
                .optional(),
              option_greeks: z
                .object({
                  delta: z.number().nullable().optional(),
                  theta: z.number().nullable().optional(),
                  gamma: z.number().nullable().optional(),
                  vega: z.number().nullable().optional(),
                  rho: z.number().nullable().optional(),
                  iv: z.number().nullable().optional(),
                })
                .nullable()
                .optional(),
            })
            .nullable()
            .optional(),
          put_options: z
            .object({
              instrument_key: z.string().optional(),
              market_data: z
                .object({
                  ltp: z.number().nullable().optional(),
                  volume: z.number().nullable().optional(),
                  oi: z.number().nullable().optional(),
                  close_price: z.number().nullable().optional(),
                  bid_price: z.number().nullable().optional(),
                  bid_qty: z.number().nullable().optional(),
                  ask_price: z.number().nullable().optional(),
                  ask_qty: z.number().nullable().optional(),
                  prev_oi: z.number().nullable().optional(),
                })
                .nullable()
                .optional(),
              option_greeks: z
                .object({
                  delta: z.number().nullable().optional(),
                  theta: z.number().nullable().optional(),
                  gamma: z.number().nullable().optional(),
                  vega: z.number().nullable().optional(),
                  rho: z.number().nullable().optional(),
                  iv: z.number().nullable().optional(),
                })
                .nullable()
                .optional(),
            })
            .nullable()
            .optional(),
        })
        .passthrough()
    )
    .optional(),
});

export const UpstoxOptionContractsResponseSchema = z.object({
  status: z.string().optional(),
  data: z
    .array(
      z.union([
        z.string(),
        z
          .object({
            expiry: z.string().optional(),
            strike_price: z.number().optional(),
            instrument_key: z.string().optional(),
            instrument_type: z.string().optional(),
          })
          .passthrough(),
      ])
    )
    .optional(),
});

export const UpstoxWsAuthorizeResponseSchema = z.object({
  status: z.string(),
  data: z.object({
    authorized_redirect_uri: z.string(),
  }),
});
