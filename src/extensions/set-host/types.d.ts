declare interface Rule {
  request?: {
    /**
     * Sets the host header of the request.
     */
    setHost?:
      | {
          /**
           * Sets the host header to the value matching the target host. (default)
           */
          from: 'target';
        }
      | {
          /**
           * Sets the host header explicitly to the given value.
           */
          to: string;
        };
  };
}
