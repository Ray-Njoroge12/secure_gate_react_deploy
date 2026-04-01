import { jest } from '@jest/globals';

// Set up mocks BEFORE importing the module under test (required for ESM mocking)
const mockDone = jest.fn();
const mockSpan = { setTag: jest.fn() };
const mockTracer = {
  trace: jest.fn((name, opts, cb) => {
    cb(mockSpan, mockDone);
  })
};

jest.unstable_mockModule('dd-trace', () => ({ default: mockTracer }));

jest.unstable_mockModule('../../../src/utils/tracing.js', () => ({
  getTracer: jest.fn().mockResolvedValue(mockTracer),
  startSpan: jest.fn(),
  traceAsync: jest.fn()
}));

// Dynamic import AFTER mock registration
const { traceRoute } = await import('../../../src/middleware/traceMiddleware.js');
const { getTracer: mockGetTracer } = await import('../../../src/utils/tracing.js');

describe('traceRoute middleware', () => {
  let req, res, next;

  beforeEach(() => {
    jest.clearAllMocks();
    // Restore implementations reset by resetMocks between tests
    mockTracer.trace.mockImplementation((name, opts, cb) => { cb(mockSpan, mockDone); });
    mockGetTracer.mockResolvedValue(mockTracer);
    req = {
      method: 'GET',
      path: '/api/visitors',
      user: { estate_id: 'estate-abc' }
    };
    res = {
      statusCode: 200,
      on: jest.fn()
    };
    next = jest.fn();
  });

  // Flush microtask queue so getTracer()'s async import resolves
  const flush = () => new Promise(r => setTimeout(r, 0));

  test('calls tracer.trace() with the operation name and correct options', async () => {
    const middleware = traceRoute('auth.login');
    middleware(req, res, next);
    await flush();

    expect(mockTracer.trace).toHaveBeenCalledWith(
      'auth.login',
      expect.objectContaining({
        resource: 'GET /api/visitors',
        tags: expect.objectContaining({
          route: '/api/visitors',
          method: 'GET',
          estate_id: 'estate-abc'
        })
      }),
      expect.any(Function)
    );
  });

  test('calls next() inside the tracer.trace() callback', async () => {
    const middleware = traceRoute('auth.login');
    middleware(req, res, next);
    await flush();

    expect(next).toHaveBeenCalled();
  });

  test('sets http.status_code tag and calls done() on response finish', async () => {
    let finishHandler;
    res.on = jest.fn((event, handler) => {
      if (event === 'finish') finishHandler = handler;
    });

    const middleware = traceRoute('auth.login');
    middleware(req, res, next);
    await flush();

    res.statusCode = 201;
    finishHandler();

    expect(mockSpan.setTag).toHaveBeenCalledWith('http.status_code', 201);
    expect(mockDone).toHaveBeenCalledWith();
  });

  test('sets error tag and calls done(err) on response error', async () => {
    let errorHandler;
    res.on = jest.fn((event, handler) => {
      if (event === 'error') errorHandler = handler;
    });

    const middleware = traceRoute('auth.login');
    middleware(req, res, next);
    await flush();

    const err = new Error('socket hang up');
    errorHandler(err);

    expect(mockSpan.setTag).toHaveBeenCalledWith('error', true);
    expect(mockDone).toHaveBeenCalledWith(err);
  });

  test('merges tagsProvider result into span tags', async () => {
    const tagsProvider = () => ({ visitor_id: 'v-999' });
    const middleware = traceRoute('visitor.create', tagsProvider);
    middleware(req, res, next);
    await flush();

    expect(mockTracer.trace).toHaveBeenCalledWith(
      'visitor.create',
      expect.objectContaining({
        tags: expect.objectContaining({ visitor_id: 'v-999' })
      }),
      expect.any(Function)
    );
  });

  test('calls next() immediately when tracer returns null', async () => {
    // Actually test the null-tracer path: getTracer returns null, so next() is
    // called directly in the `if (!tracer) return next()` branch
    mockGetTracer.mockResolvedValueOnce(null);

    const middleware = traceRoute('any.op');
    middleware(req, res, next);
    await flush();

    expect(next).toHaveBeenCalled();
    expect(mockTracer.trace).not.toHaveBeenCalled();
  });
});
