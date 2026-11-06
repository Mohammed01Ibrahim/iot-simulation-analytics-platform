FROM golang:1.24.2-bookworm AS build
ARG MINIO_VERSION=v0.0.0-20250422221226-0d7408fc9969
RUN go install github.com/minio/minio@${MINIO_VERSION} && cp /go/pkg/mod/github.com/minio/minio@${MINIO_VERSION}/LICENSE /tmp/MINIO-LICENSE
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/* && useradd --uid 10001 minio && mkdir /data && chown minio /data
COPY --from=build /go/bin/minio /usr/local/bin/minio
COPY --from=build /tmp/MINIO-LICENSE /usr/share/doc/minio/LICENSE
USER minio
EXPOSE 9000 9001
ENTRYPOINT ["minio"]
CMD ["server","/data","--console-address",":9001"]
