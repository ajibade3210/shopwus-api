import { describe, expect, it, jest } from "@jest/globals";
import {
  formatDocumentNumber,
  generateDocumentNumber,
  getNextSequenceNumber,
  type SequenceDbClient,
} from "../../src/utils/sequence.utils";

describe("Document Sequence Utility Unit Tests", () => {
  describe("formatDocumentNumber", () => {
    it("formats standard invoice numbers with 4-digit zero padding", () => {
      expect(formatDocumentNumber("INV", 2026, 1)).toBe("INV-2026-0001");
      expect(formatDocumentNumber("INV", 2026, 42)).toBe("INV-2026-0042");
      expect(formatDocumentNumber("INV", 2026, 999)).toBe("INV-2026-0999");
      expect(formatDocumentNumber("INV", 2026, 1000)).toBe("INV-2026-1000");
    });

    it("supports custom document prefixes and padding lengths", () => {
      expect(formatDocumentNumber("ORD", 2026, 5, 6)).toBe("ORD-2026-000005");
      expect(formatDocumentNumber("REC", 2027, 12, 3)).toBe("REC-2027-012");
    });
  });

  describe("getNextSequenceNumber & generateDocumentNumber", () => {
    it("delegates to raw query and returns the next sequence number", async () => {
      const mockDb = {
        $queryRaw: jest
          .fn()
          .mockResolvedValue([
            { lastNumber: 5 },
          ] as unknown as never) as unknown as SequenceDbClient["$queryRaw"],
      } as unknown as SequenceDbClient;

      const seq = await getNextSequenceNumber("biz-123", {
        type: "INVOICE",
        year: 2026,
        client: mockDb,
      });

      expect(seq).toBe(5);
      expect(mockDb.$queryRaw).toHaveBeenCalledTimes(1);
    });

    it("formats generated document number correctly with custom mock client", async () => {
      const mockDb = {
        $queryRaw: jest
          .fn()
          .mockResolvedValue([
            { lastNumber: 12 },
          ] as unknown as never) as unknown as SequenceDbClient["$queryRaw"],
      } as unknown as SequenceDbClient;

      const docNum = await generateDocumentNumber("biz-123", "INV", {
        year: 2026,
        client: mockDb,
      });

      expect(docNum).toBe("INV-2026-0012");
    });

    it("handles concurrent requests sequentially without collision", async () => {
      let currentCounter = 0;
      // Simulate atomic PostgreSQL row-level lock behavior
      const mockDb = {
        $queryRaw: jest.fn().mockImplementation(async () => {
          currentCounter += 1;
          return [{ lastNumber: currentCounter }];
        }) as unknown as SequenceDbClient["$queryRaw"],
      } as unknown as SequenceDbClient;

      const concurrentCalls = Array.from({ length: 25 }, () =>
        generateDocumentNumber("biz-123", "INV", {
          year: 2026,
          client: mockDb,
        }),
      );

      const results = await Promise.all(concurrentCalls);

      // Verify all 25 numbers are unique
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(25);

      // Verify sequence matches expected consecutive order
      expect(results[0]).toBe("INV-2026-0001");
      expect(results[24]).toBe("INV-2026-0025");
    });
  });
});
