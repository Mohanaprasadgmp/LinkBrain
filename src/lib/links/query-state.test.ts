import { describe, expect, it } from "vitest";

import {
  parseLinkListSearchParams,
  stateToFilter,
  stateToSearchParams,
} from "./query-state";

describe("parseLinkListSearchParams", () => {
  it("defaults to an empty, unfiltered, page-1 state", () => {
    const state = parseLinkListSearchParams(new URLSearchParams());

    expect(state).toEqual({
      query: "",
      status: [],
      priority: [],
      projectId: null,
      favorite: false,
      sort: "newest",
      page: 1,
    });
  });

  it("parses every combinable filter together", () => {
    const params = new URLSearchParams(
      "q=dynamodb&status=saved,reading&priority=must-read&project=proj-1&favorite=1&sort=title&page=3",
    );

    const state = parseLinkListSearchParams(params);

    expect(state).toEqual({
      query: "dynamodb",
      status: ["saved", "reading"],
      priority: ["must-read"],
      projectId: "proj-1",
      favorite: true,
      sort: "title",
      page: 3,
    });
  });

  it("drops unknown status/priority/sort values rather than throwing", () => {
    const params = new URLSearchParams("status=saved,bogus&priority=nope&sort=alphabetical");

    const state = parseLinkListSearchParams(params);

    expect(state.status).toEqual(["saved"]);
    expect(state.priority).toEqual([]);
    expect(state.sort).toBe("newest");
  });

  it("falls back to page 1 for invalid page values", () => {
    expect(parseLinkListSearchParams(new URLSearchParams("page=0")).page).toBe(1);
    expect(parseLinkListSearchParams(new URLSearchParams("page=-3")).page).toBe(1);
    expect(parseLinkListSearchParams(new URLSearchParams("page=abc")).page).toBe(1);
    expect(parseLinkListSearchParams(new URLSearchParams("page=2.9")).page).toBe(2);
  });

  it("also parses the plain object shape Next's Server Component searchParams provides", () => {
    const state = parseLinkListSearchParams({
      q: "aws",
      status: "reading",
      priority: undefined,
    });

    expect(state.query).toBe("aws");
    expect(state.status).toEqual(["reading"]);
    expect(state.priority).toEqual([]);
  });
});

describe("stateToSearchParams", () => {
  it("omits every field at its default value", () => {
    const params = stateToSearchParams({ sort: "newest", page: 1 });
    expect(params.toString()).toBe("");
  });

  it("round-trips a fully populated state through parse -> serialise -> parse", () => {
    const original = parseLinkListSearchParams(
      new URLSearchParams(
        "q=dynamodb&status=saved,reading&priority=must-read&project=proj-1&favorite=1&sort=priority&page=2",
      ),
    );

    const roundTripped = parseLinkListSearchParams(stateToSearchParams(original));

    expect(roundTripped).toEqual(original);
  });
});

describe("stateToFilter", () => {
  it("maps an empty state to an all-undefined filter", () => {
    const state = parseLinkListSearchParams(new URLSearchParams());
    expect(stateToFilter(state)).toEqual({
      query: undefined,
      status: undefined,
      priority: undefined,
      projectId: undefined,
      isFavorite: undefined,
    });
  });

  it("maps a combined state to a fully populated LinkFilter", () => {
    const state = parseLinkListSearchParams(
      new URLSearchParams("q=aws&status=saved&priority=must-read&project=proj-1&favorite=1"),
    );

    expect(stateToFilter(state)).toEqual({
      query: "aws",
      status: ["saved"],
      priority: ["must-read"],
      projectId: "proj-1",
      isFavorite: true,
    });
  });
});
