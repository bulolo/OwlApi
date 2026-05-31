{{/*
Expand the name of the chart.
*/}}
{{- define "owlapi.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "owlapi.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "owlapi.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
app.kubernetes.io/name: {{ include "owlapi.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels (stable subset used by matchLabels)
*/}}
{{- define "owlapi.selectorLabels" -}}
app.kubernetes.io/name: {{ include "owlapi.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Image reference for owlapi services (uses registry + image name + tag).
Usage: {{ include "owlapi.image" (dict "root" . "name" "backend") }}
*/}}
{{- define "owlapi.image" -}}
{{- $root := .root }}
{{- printf "%s/%s:%s" $root.Values.image.registry .name $root.Values.image.tag }}
{{- end }}

{{/*
PostgreSQL DSN — built from values, works for both internal and external postgres.
*/}}
{{- define "owlapi.databaseUrl" -}}
{{- if .Values.postgres.enabled }}
{{- printf "postgres://%s:%s@%s-postgres:5432/%s?sslmode=disable"
    .Values.postgres.user
    .Values.postgres.password
    (include "owlapi.fullname" .)
    .Values.postgres.database }}
{{- else }}
{{- printf "postgres://%s:%s@%s:%d/%s?sslmode=disable"
    .Values.postgres.user
    .Values.postgres.password
    .Values.postgres.external.host
    (.Values.postgres.external.port | int)
    .Values.postgres.database }}
{{- end }}
{{- end }}

{{/*
Backend service URL for gateway (auto-derived if not set).
*/}}
{{- define "owlapi.backendUrl" -}}
{{- if .Values.gateway.serverUrl }}
{{- .Values.gateway.serverUrl }}
{{- else }}
{{- printf "http://%s-backend:%d" (include "owlapi.fullname" .) (.Values.backend.httpPort | int) }}
{{- end }}
{{- end }}

{{/*
SDK Builder URL for backend.
*/}}
{{- define "owlapi.sdkbuilderUrl" -}}
{{- printf "http://%s-sdkbuilder:%d" (include "owlapi.fullname" .) (.Values.ee.sdkbuilder.port | int) }}
{{- end }}
