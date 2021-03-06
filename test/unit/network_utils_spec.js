/* Copyright 2017 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  createResponseStatusError, validateRangeRequestCapabilities,
  validateResponseStatus
} from '../../src/display/network_utils';
import {
  MissingPDFException, UnexpectedResponseException
} from '../../src/shared/util';

describe('network_utils', function() {
  describe('validateRangeRequestCapabilities', function() {
    const defaultValues = {
      allowRangeRequests: false,
      suggestedLength: undefined,
    };

    it('rejects range chunk sizes that are not larger than zero', function() {
      expect(function() {
        validateRangeRequestCapabilities({ rangeChunkSize: 0, });
      }).toThrow(new Error('Range chunk size must be larger than zero'));
    });

    it('rejects disabled or non-HTTP range requests', function() {
      expect(validateRangeRequestCapabilities({
        disableRange: true,
        isHttp: true,
        rangeChunkSize: 64,
      })).toEqual(defaultValues);

      expect(validateRangeRequestCapabilities({
        disableRange: false,
        isHttp: false,
        rangeChunkSize: 64,
      })).toEqual(defaultValues);
    });

    it('rejects invalid Accept-Ranges header values', function() {
      expect(validateRangeRequestCapabilities({
        disableRange: false,
        isHttp: true,
        getResponseHeader: (headerName) => {
          if (headerName === 'Accept-Ranges') {
            return 'none';
          }
        },
        rangeChunkSize: 64,
      })).toEqual(defaultValues);
    });

    it('rejects invalid Content-Encoding header values', function() {
      expect(validateRangeRequestCapabilities({
        disableRange: false,
        isHttp: true,
        getResponseHeader: (headerName) => {
          if (headerName === 'Accept-Ranges') {
            return 'bytes';
          } else if (headerName === 'Content-Encoding') {
            return 'gzip';
          }
        },
        rangeChunkSize: 64,
      })).toEqual(defaultValues);
    });

    it('rejects invalid Content-Length header values', function() {
      expect(validateRangeRequestCapabilities({
        disableRange: false,
        isHttp: true,
        getResponseHeader: (headerName) => {
          if (headerName === 'Accept-Ranges') {
            return 'bytes';
          } else if (headerName === 'Content-Encoding') {
            return null;
          } else if (headerName === 'Content-Length') {
            return 'eight';
          }
        },
        rangeChunkSize: 64,
      })).toEqual(defaultValues);
    });

    it('rejects file sizes that are too small for range requests', function() {
      expect(validateRangeRequestCapabilities({
        disableRange: false,
        isHttp: true,
        getResponseHeader: (headerName) => {
          if (headerName === 'Accept-Ranges') {
            return 'bytes';
          } else if (headerName === 'Content-Encoding') {
            return null;
          } else if (headerName === 'Content-Length') {
            return 8;
          }
        },
        rangeChunkSize: 64,
      })).toEqual({
        allowRangeRequests: false,
        suggestedLength: 8,
      });
    });

    it('accepts file sizes large enough for range requests', function() {
      expect(validateRangeRequestCapabilities({
        disableRange: false,
        isHttp: true,
        getResponseHeader: (headerName) => {
          if (headerName === 'Accept-Ranges') {
            return 'bytes';
          } else if (headerName === 'Content-Encoding') {
            return null;
          } else if (headerName === 'Content-Length') {
            return 8192;
          }
        },
        rangeChunkSize: 64,
      })).toEqual({
        allowRangeRequests: true,
        suggestedLength: 8192,
      });
    });
  });

  describe('createResponseStatusError', function() {
    it('handles missing PDF file responses', function() {
      expect(createResponseStatusError(404, 'https://foo.com/bar.pdf')).toEqual(
        new MissingPDFException('Missing PDF "https://foo.com/bar.pdf".')
      );

      expect(createResponseStatusError(0, 'file://foo.pdf')).toEqual(
        new MissingPDFException('Missing PDF "file://foo.pdf".')
      );
    });

    it('handles unexpected responses', function() {
      expect(createResponseStatusError(302, 'https://foo.com/bar.pdf')).toEqual(
        new UnexpectedResponseException(
          'Unexpected server response (302) while retrieving PDF ' +
          '"https://foo.com/bar.pdf".'
        )
      );

      expect(createResponseStatusError(0, 'https://foo.com/bar.pdf')).toEqual(
        new UnexpectedResponseException(
          'Unexpected server response (0) while retrieving PDF ' +
          '"https://foo.com/bar.pdf".'
        )
      );
    });
  });

  describe('validateResponseStatus', function() {
    it('accepts valid response statuses', function() {
      expect(validateResponseStatus(200)).toEqual(true);
      expect(validateResponseStatus(206)).toEqual(true);
    });

    it('rejects invalid response statuses', function() {
      expect(validateResponseStatus(302)).toEqual(false);
      expect(validateResponseStatus(404)).toEqual(false);
      expect(validateResponseStatus(null)).toEqual(false);
      expect(validateResponseStatus(undefined)).toEqual(false);
    });
  });
});
