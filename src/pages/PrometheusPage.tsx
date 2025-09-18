import { promQuery, PROM_TARGET } from '../lib/prom'
import { usePoll } from '../hooks/usePoll'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'

// 한 번만(마운트 시) 실행해서 데이터 가져오는 훅
function useOnce<T = unknown[]>(fn: (signal?: AbortSignal) => Promise<T>, ignoreAbort = true) {
  const [data, setData] = useState<T | undefined>();
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (isLoading) return; // 이미 로딩 중이면 중복 실행 방지
    
    setIsLoading(true);
    const ac = new AbortController();
    
    fn(ac.signal)
      .then((result) => {
        setData(result);
        setError(null);
      })
      .catch((e) => {
        // AbortError는 무시 (기본값) 또는 에러로 처리
        if (e instanceof Error && e.name === 'AbortError' && ignoreAbort) {
          return;
        }
        setError(e);
      })
      .finally(() => {
        setIsLoading(false);
      });
      
    return () => ac.abort();
  }, []); // 빈 의존성 배열로 마운트 시에만 실행
  return { data, error };
}

// ===== Prometheus windows & polling =====
const WINDOW_RATE = '5m'   // smoothing for rate()
const POLL_MS = 5000          // 기존 폴링(컴포넌트/호스트 등)
const BROKER_POLL_MS = 10000

// ===== Debug: Available Metrics =====
// 디버깅을 위한 메트릭 목록 확인 (컴포넌트 내부에서 사용)

// helpers
const tsOf = (res?: unknown[]) => {
  const ts = (res?.[0] as { value?: [number, string] })?.value?.[0]
  return typeof ts === 'number' ? ts : Number(ts || 0)
}
const ageSec = (ts?: number) => {
  if (!ts) return '…'
  const now = Date.now() / 1000
  return `${Math.max(0, Math.round(now - ts))}s ago`
}
const n = (v: unknown, d = 2) => {
  const x = Number(v)
  return Number.isFinite(x) ? x.toFixed(d) : '…'
}

// pretty formatting
const comma = (v?: unknown) => {
  const x = Number(v)
  return Number.isFinite(x) ? x.toLocaleString() : '…'
}
const fmtBytes = (v?: unknown) => {
  const x = Number(v)
  if (!Number.isFinite(x)) return '…'
  const units = ['B/s','KB/s','MB/s','GB/s','TB/s']
  let i = 0, num = x
  while (num >= 1024 && i < units.length - 1) { num /= 1024; i++ }
  return `${num.toFixed(1)} ${units[i]}`
}

// Format uptime in human readable format
const fmtUptime = (v?: unknown) => {
  const x = Number(v)
  if (!Number.isFinite(x)) return '…'
  const days = Math.floor(x / 86400)
  const hours = Math.floor((x % 86400) / 3600)
  const minutes = Math.floor((x % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

// Format percentage with color coding
const fmtPercent = (v?: unknown, warning = 80, critical = 90) => {
  const x = Number(v)
  if (!Number.isFinite(x)) return '…'
  const percent = x.toFixed(1)
  if (x >= critical) return `${percent}% (위험)`
  if (x >= warning) return `${percent}% (주의)`
  return `${percent}%`
}

// Get color class based on percentage value
const getPercentColor = (v?: unknown, warning = 80, critical = 90) => {
  const x = Number(v)
  if (!Number.isFinite(x)) return 'text-gray-500'
  if (x >= critical) return 'text-red-600 dark:text-red-400'
  if (x >= warning) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

// Get color class for status values
const getStatusColor = (v?: unknown) => {
  const x = Number(v)
  if (!Number.isFinite(x)) return 'text-gray-500'
  return x === 1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
}

// Get color class for load average
const getLoadColor = (v?: unknown, cores = 4) => {
  const x = Number(v)
  if (!Number.isFinite(x)) return 'text-gray-500'
  if (x >= cores * 2) return 'text-red-600 dark:text-red-400'
  if (x >= cores) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

// Format temperature with both Celsius and Kelvin
const fmtTemp = (v?: unknown) => {
  const x = Number(v)
  if (!Number.isFinite(x)) return '…'
  const kelvin = x + 273.15
  return `${x.toFixed(1)}°C (${kelvin.toFixed(1)}K)`
}


// Get color class for temperature (based on Celsius)
const getTempColor = (v?: unknown, warning = 70, critical = 85) => {
  const x = Number(v)
  if (!Number.isFinite(x)) return 'text-gray-500'
  if (x >= critical) return 'text-red-600 dark:text-red-400'
  if (x >= warning) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-green-600 dark:text-green-400'
}

// Convert Prometheus vector result to { instance -> value }
const toMap = (res?: unknown[]) => {
  const m = new Map<string, number>()
  for (const r of res || []) {
    const item = r as { metric?: { instance?: string; hostname?: string }; value?: [number, string] }
    const inst = item.metric?.instance || item.metric?.hostname || 'unknown'
    const v = Number(item.value?.[1])
    if (Number.isFinite(v)) m.set(inst, v)
  }
  return m
}

// Convert Prometheus vector result to { <label> -> value }
const toMapBy = (res?: unknown[], label: string = 'instance') => {
  const m = new Map<string, number>()
  for (const r of res || []) {
    const item = r as { metric?: Record<string, string>; value?: [number, string] }
    const key = item.metric?.[label]
    const v = Number(item.value?.[1])
    if (key && Number.isFinite(v)) m.set(key, v)
  }
  return m
}

// Union of instance keys from multiple maps
const unionInstances = (...maps: Map<string, number>[]) => {
  const s = new Set<string>()
  for (const m of maps) for (const k of m.keys()) s.add(k)
  return Array.from(s).sort()
}

export default function PrometheusPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [isComponentsExpanded, setIsComponentsExpanded] = useState(true)
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  // 디버깅을 위한 메트릭 목록 확인 (AbortError도 에러로 처리)
  const availableMetrics = useOnce((signal) => promQuery(`up{job=~"kafka.*"}`, signal), false)
  const availableNodeMetrics = useOnce((signal) => promQuery(`up{job=~"node.*"}`, signal), false)
  const availableJMXMetrics = useOnce((signal) => promQuery(`up{job=~".*JMX.*"}`, signal), false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  // ===== 1) Component/Process up/health =====
  // Prometheus 'up' by job/instance
  const upAll = usePoll((signal) =>
    promQuery(`up{job=~"prometheus|node-exporter|kafka-controller|kafka-broker|schema-registry|kafka-connect"}`, signal), POLL_MS)
  
  
  // Optional: blackbox_exporter HTTP checks (1 = healthy)
  const probe = usePoll((signal) =>
    promQuery(`probe_success{job="blackbox-http"}`, signal), POLL_MS)

  // ===== 2) Host resource monitoring (node_exporter) =====
  // CPU usage % by instance
  const cpu = usePoll((signal) =>
    promQuery(`100 - avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[${WINDOW_RATE}])) * 100`, signal), POLL_MS)

  // Memory usage % by instance
  const mem = usePoll((signal) =>
    promQuery(`(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100`, signal), POLL_MS)

  // Disk usage % per instance (exclude tmpfs/overlay)
  const diskUse = usePoll((signal) =>
    promQuery(`max by(instance) (100 - (node_filesystem_avail_bytes{fstype!~"tmpfs|overlay"} / node_filesystem_size_bytes{fstype!~"tmpfs|overlay"}) * 100)`, signal), POLL_MS)

  // Disk I/O bytes/s by instance
  const diskRead = usePoll((signal) =>
    promQuery(`sum by(instance) (rate(node_disk_read_bytes_total[${WINDOW_RATE}]))`, signal), POLL_MS)
  const diskWrite = usePoll((signal) =>
    promQuery(`sum by(instance) (rate(node_disk_written_bytes_total[${WINDOW_RATE}]))`, signal), POLL_MS)

  // Network RX/TX bytes/s by instance (exclude lo)
  const netRx = usePoll((signal) =>
    promQuery(`sum by(instance) (rate(node_network_receive_bytes_total{device!~"lo"}[${WINDOW_RATE}]))`, signal), POLL_MS)
  const netTx = usePoll((signal) =>
    promQuery(`sum by(instance) (rate(node_network_transmit_bytes_total{device!~"lo"}[${WINDOW_RATE}]))`, signal), POLL_MS)

  // ===== Additional Node Exporter Metrics =====
  // Load average (1m, 5m, 15m)
  const load1m = usePoll((signal) =>
    promQuery(`node_load1`, signal), POLL_MS)
  const load5m = usePoll((signal) =>
    promQuery(`node_load5`, signal), POLL_MS)
  const load15m = usePoll((signal) =>
    promQuery(`node_load15`, signal), POLL_MS)

  // File descriptors usage
  const fdUsed = usePoll((signal) =>
    promQuery(`node_filefd_allocated`, signal), POLL_MS)
  const fdMax = usePoll((signal) =>
    promQuery(`node_filefd_maximum`, signal), POLL_MS)

  // Process count
  const processCount = usePoll((signal) =>
    promQuery(`node_processes_state{state="running"}`, signal), POLL_MS)

  // System uptime
  const uptime = usePoll((signal) =>
    promQuery(`time() - node_boot_time_seconds`, signal), POLL_MS)

  // Temperature (if available)
  const temperature = usePoll((signal) =>
    promQuery(`node_hwmon_temp_celsius`, signal), POLL_MS)

  // Network connections
  const tcpConnections = usePoll((signal) =>
    promQuery(`node_netstat_Tcp_CurrEstab`, signal), POLL_MS)

  // Swap usage
  const swapUsed = usePoll((signal) =>
    promQuery(`(node_memory_SwapTotal_bytes - node_memory_SwapFree_bytes) / node_memory_SwapTotal_bytes * 100`, signal), POLL_MS)

  // ===== 4) Producer Metrics =====
  // Producer message rate (messages per second) - try multiple metric names including broker metrics
  const producerMsgRate = usePoll((signal) =>
    promQuery(`sum(rate(kafka_producer_record_send_total[${WINDOW_RATE}])) or sum(rate(kafka_producer_metrics_record_send_total[${WINDOW_RATE}])) or sum(rate(kafka_producer_metrics_records_sent_total[${WINDOW_RATE}])) or sum(rate(kafka_producer_metrics_messages_sent_total[${WINDOW_RATE}])) or sum(rate(kafka_producer_metrics_MessagesPerSec_OneMinuteRate[${WINDOW_RATE}])) or sum(rate(kafka_server_BrokerTopicMetrics_MessagesInPerSec_OneMinuteRate[${WINDOW_RATE}]))`, signal), POLL_MS)

  // Producer byte rate (bytes per second)
  const producerByteRate = usePoll((signal) =>
    promQuery(`sum(rate(kafka_producer_record_send_total[${WINDOW_RATE}])) * avg(kafka_producer_record_size_avg)`, signal), POLL_MS)

  // Producer error rate - try multiple metric names
  const producerErrorRate = usePoll((signal) =>
    promQuery(`sum(rate(kafka_producer_record_send_failed_total[${WINDOW_RATE}])) or sum(rate(kafka_producer_metrics_record_send_failed_total[${WINDOW_RATE}])) or sum(rate(kafka_producer_metrics_RecordErrorRate[${WINDOW_RATE}]))`, signal), POLL_MS)

  // Producer batch size
  const producerBatchSize = usePoll((signal) =>
    promQuery(`avg(kafka_producer_batch_size_avg)`, signal), POLL_MS)

  // Producer request rate
  const producerRequestRate = usePoll((signal) =>
    promQuery(`sum(rate(kafka_producer_request_total[${WINDOW_RATE}]))`, signal), POLL_MS)

  // ===== 5) Consumer Metrics =====
  // Consumer message rate (messages per second) - try multiple metric names including broker metrics
  const consumerMsgRate = usePoll((signal) =>
    promQuery(`sum(rate(kafka_consumer_messages_consumed_total[${WINDOW_RATE}])) or sum(rate(kafka_consumer_metrics_messages_consumed_total[${WINDOW_RATE}])) or sum(rate(kafka_consumer_metrics_records_consumed_total[${WINDOW_RATE}])) or sum(rate(kafka_consumer_metrics_MessagesPerSec_OneMinuteRate[${WINDOW_RATE}])) or sum(rate(kafka_server_BrokerTopicMetrics_MessagesOutPerSec_OneMinuteRate[${WINDOW_RATE}]))`, signal), POLL_MS)

  // Consumer byte rate (bytes per second)
  const consumerByteRate = usePoll((signal) =>
    promQuery(`sum(rate(kafka_consumer_bytes_consumed_total[${WINDOW_RATE}]))`, signal), POLL_MS)

  // Consumer lag (offset lag)
  const consumerLag = usePoll((signal) =>
    promQuery(`sum(kafka_consumer_lag_sum)`, signal), POLL_MS)

  // Consumer fetch rate
  const consumerFetchRate = usePoll((signal) =>
    promQuery(`sum(rate(kafka_consumer_fetch_total[${WINDOW_RATE}]))`, signal), POLL_MS)

  // Consumer rebalance rate
  const consumerRebalanceRate = usePoll((signal) =>
    promQuery(`sum(rate(kafka_consumer_rebalance_total[${WINDOW_RATE}]))`, signal), POLL_MS)

  // ===== 3) Kafka broker important metrics (JMX exporter variants) =====
  // Some environments expose different metric names; try common fallbacks via OR
  const urp = usePoll((signal) =>
    promQuery(
      `(
        kafka_under_replicated_partitions
        or kafka_server_replicamanager_underreplicatedpartitions
      )`,
      signal
    ), POLL_MS)

  const offline = usePoll((signal) =>
    promQuery(
      `(
        kafka_offline_partitions_count
        or kafka_controller_kafkacontroller_offlinepartitionscount
      )`,
      signal
    ), POLL_MS)

  const activeController = usePoll((signal) =>
    promQuery(
      `(
        kafka_active_controller_count
        or kafka_controller_kafkacontroller_activecontrollercount
      )`,
      signal
    ), POLL_MS)

  // ===== 4) Totals: topics & partitions =====
  // Prefer kafka-exporter; fall back to JMX-derived where possible
const topics = useOnce((signal) =>
  promQuery(
    `(
      sum(kafka_topics)
      or count(count by (topic) (
        kafka_server_brokertopicmetrics_bytesinpersec_fiveminuterate
        or kafka_server_brokertopicmetrics_bytesoutpersec_fiveminuterate
      ))
    )`,
    signal
  )
);


const partitions = useOnce((signal) =>
  promQuery(
    `(
      sum(kafka_topic_partitions)
      or sum(kafka_server_replicamanager_partitioncount)
      or max(kafka_controller_kafkacontroller_globalpartitioncount)
    )`,
    signal
  )
);

  // ===== 4-1) User topics (names & count) — fetched once on refresh =====
  // We derive user-created topics from per-topic JMX metrics and filter out system/internal prefixes.
  const USER_TOPIC_NEG_RE = "__.*|_confluent.*|_schemas|_connect-.*|_confluent-controlcenter.*|_monitoring.*|_kafka-.*|_consumer_.*|_schemas.*";

  const userTopics = useOnce(async (signal) => {
    const inRes  = await promQuery(
      `kafka_server_brokertopicmetrics_bytesinpersec_fiveminuterate{topic!~"${USER_TOPIC_NEG_RE}"}`,
      signal
    );
    const outRes = await promQuery(
      `kafka_server_brokertopicmetrics_bytesoutpersec_fiveminuterate{topic!~"${USER_TOPIC_NEG_RE}"}`,
      signal
    );
    const s = new Set<string>();
    for (const r of inRes || [])  if (r.metric?.topic) s.add(r.metric.topic);
    for (const r of outRes || []) if (r.metric?.topic) s.add(r.metric.topic);
    return Array.from(s).sort();
  });

  // ===== 5) Client traffic: producer/consumer bytes/s (broker total; name variants) =====
const bytesIn = usePoll((signal) =>
  promQuery(`sum(kafka_server_brokertopicmetrics_bytesinpersec_fiveminuterate)`, signal),
  BROKER_POLL_MS
)
const bytesOut = usePoll((signal) =>
  promQuery(`sum(kafka_server_brokertopicmetrics_bytesoutpersec_fiveminuterate)`, signal),
  BROKER_POLL_MS
)

const bytesInByInst = usePoll((signal) =>
  promQuery(`sum by(instance, hostname) (kafka_server_brokertopicmetrics_bytesinpersec_fiveminuterate)`, signal),
  BROKER_POLL_MS
)
const bytesOutByInst = usePoll((signal) =>
  promQuery(`sum by(instance, hostname) (kafka_server_brokertopicmetrics_bytesoutpersec_fiveminuterate)`, signal),
  BROKER_POLL_MS
)

// Per-topic throughput (10s polling)
const topicBytesIn = usePoll((signal) =>
  promQuery(
    `sum by(topic) (kafka_server_brokertopicmetrics_bytesinpersec_fiveminuterate{topic!~"${USER_TOPIC_NEG_RE}"})`,
    signal
  ),
  BROKER_POLL_MS
)
const topicBytesOut = usePoll((signal) =>
  promQuery(
    `sum by(topic) (kafka_server_brokertopicmetrics_bytesoutpersec_fiveminuterate{topic!~"${USER_TOPIC_NEG_RE}"})`,
    signal
  ),
  BROKER_POLL_MS
)
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                대시보드로 돌아가기
              </button>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Kafka 시스템 모니터링 (Prometheus)
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Banner */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Prometheus 연결 상태
              </h2>
            
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  타겟 서버: {PROM_TARGET || '환경 변수 VITE_PROM_URL이 설정되지 않았습니다'}
                </p>
                <button
                  onClick={() => setShowDebugInfo(!showDebugInfo)}
                  className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  {showDebugInfo ? '디버그 숨기기' : '디버그 정보 보기'}
                </button>
              </div>
              {!PROM_TARGET && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  ⚠️ .env 파일에 VITE_PROM_URL을 설정해주세요
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-blue-600 dark:text-blue-400">
                마지막 업데이트: {ageSec(Math.max(
                  tsOf(upAll.data), tsOf(cpu.data), tsOf(urp.data), tsOf(bytesIn.data),
                  tsOf(load1m.data), tsOf(fdUsed.data), tsOf(uptime.data),
                  tsOf(producerMsgRate.data), tsOf(consumerMsgRate.data)
                ))}
              </div>
              {upAll.error && (
                <div className="text-red-600 text-sm mt-1">
                  오류: {upAll.error.message}
                  {upAll.error.name === 'AbortError' && (
                    <span className="text-gray-500 ml-2">(요청이 취소됨)</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      {/* Section: Process/Component status */}
      <section className="mb-8">
        <div 
          className="flex items-center justify-between cursor-pointer mb-4"
          onClick={() => setIsComponentsExpanded(!isComponentsExpanded)}
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Components</h2>
          <div className="flex items-center text-gray-500 dark:text-gray-400">
            <span className="text-sm mr-2">
              {isComponentsExpanded ? '접기' : '펼치기'}
            </span>
            {isComponentsExpanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </div>
        </div>

        {/* Debug Section */}
        {showDebugInfo && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">🔍 디버그 정보 - 사용 가능한 메트릭</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Kafka 메트릭</h3>
                {availableMetrics.error ? (
                  <div className="text-red-600 text-sm">
                    오류: {availableMetrics.error.name === 'AbortError' ? '요청이 중단되었습니다' : availableMetrics.error.message}
                  </div>
                ) : availableMetrics.data ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {Array.isArray(availableMetrics.data) && availableMetrics.data.length > 0 ? (
                      <div>
                        <div className="font-medium text-green-600 dark:text-green-400 mb-2">
                          {availableMetrics.data.length}개 메트릭 발견
                        </div>
                        <div className="max-h-32 overflow-y-auto">
                          {availableMetrics.data.slice(0, 10).map((item: unknown, i: number) => {
                            const metricItem = item as { metric?: { __name__?: string } }
                            return (
                            <div key={i} className="text-xs font-mono text-gray-500 dark:text-gray-400">
                              {metricItem.metric?.__name__ || 'Unknown'}
                            </div>
                            )
                          })}
                          {availableMetrics.data.length > 10 && (
                            <div className="text-xs text-gray-400">... 및 {availableMetrics.data.length - 10}개 더</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-red-600">Kafka 메트릭이 없습니다</div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500">로딩 중...</div>
                )}
              </div>
              
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Node 메트릭</h3>
                {availableNodeMetrics.error ? (
                  <div className="text-red-600 text-sm">
                    오류: {availableNodeMetrics.error.name === 'AbortError' ? '요청이 중단되었습니다' : availableNodeMetrics.error.message}
                  </div>
                ) : availableNodeMetrics.data ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {Array.isArray(availableNodeMetrics.data) && availableNodeMetrics.data.length > 0 ? (
                      <div>
                        <div className="font-medium text-green-600 dark:text-green-400 mb-2">
                          {availableNodeMetrics.data.length}개 메트릭 발견
                        </div>
                        <div className="max-h-32 overflow-y-auto">
                          {availableNodeMetrics.data.slice(0, 10).map((item: unknown, i: number) => {
                            const metricItem = item as { metric?: { __name__?: string } }
                            return (
                            <div key={i} className="text-xs font-mono text-gray-500 dark:text-gray-400">
                              {metricItem.metric?.__name__ || 'Unknown'}
                            </div>
                            )
                          })}
                          {availableNodeMetrics.data.length > 10 && (
                            <div className="text-xs text-gray-400">... 및 {availableNodeMetrics.data.length - 10}개 더</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-red-600">Node 메트릭이 없습니다</div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500">로딩 중...</div>
                )}
              </div>
              
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">JMX 메트릭</h3>
                {availableJMXMetrics.error ? (
                  <div className="text-red-600 text-sm">
                    오류: {availableJMXMetrics.error.name === 'AbortError' ? '요청이 중단되었습니다' : availableJMXMetrics.error.message}
                  </div>
                ) : availableJMXMetrics.data ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {Array.isArray(availableJMXMetrics.data) && availableJMXMetrics.data.length > 0 ? (
                      <div>
                        <div className="font-medium text-green-600 dark:text-green-400 mb-2">
                          {availableJMXMetrics.data.length}개 메트릭 발견
                        </div>
                        <div className="max-h-32 overflow-y-auto">
                          {availableJMXMetrics.data.slice(0, 10).map((item: unknown, i: number) => {
                            const metricItem = item as { metric?: { __name__?: string } }
                            return (
                            <div key={i} className="text-xs font-mono text-gray-500 dark:text-gray-400">
                              {metricItem.metric?.__name__ || 'Unknown'}
                            </div>
                            )
                          })}
                          {availableJMXMetrics.data.length > 10 && (
                            <div className="text-xs text-gray-400">... 및 {availableJMXMetrics.data.length - 10}개 더</div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-red-600">JMX 메트릭이 없습니다</div>
                    )}
                  </div>
                ) : (
                  <div className="text-gray-500">로딩 중...</div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {isComponentsExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(upAll.data ?? []).map((r: unknown, i: number) => {
              const item = r as { metric: { job: string; instance: string }; value: [number, string] }
              const status = Number(item.value[1])
              const statusText = status === 1 ? 'UP' : 'DOWN'
              const statusColor = getStatusColor(status)
              return (
                <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                  <div className="text-gray-500 dark:text-gray-400 text-sm">{item.metric.job} • {item.metric.instance}</div>
                  <div className={`text-lg font-bold ${statusColor}`}>
                    {statusText}
                  </div>
                </div>
              )
            })}
            {(probe.data ?? []).map((r: unknown, i: number) => {
              const item = r as { metric: { instance: string }; value: [number, string] }
              const status = Number(item.value[1])
              const statusText = status === 1 ? 'OK(HTTP)' : 'FAIL(HTTP)'
              const statusColor = getStatusColor(status)
              return (
                <div key={`p-${i}`} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
                  <div className="text-gray-500 dark:text-gray-400 text-sm">probe • {item.metric.instance}</div>
                  <div className={`text-lg font-bold ${statusColor}`}>
                    {statusText}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Section: Host resource */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Host Resources</h2>
        {(cpu.error||mem.error||diskUse.error) && (
          <div className="text-red-600 text-sm mb-4">
            {cpu.error?.message || mem.error?.message || diskUse.error?.message}
          </div>
        )}
        {(!cpu.data || cpu.data.length === 0) && (
          <div className="text-gray-500 text-sm mb-4">
            Hint: node_exporter targets appear DOWN or missing. Start node_exporter on your hosts and set targets to <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">&lt;host:9100&gt;</code>.
          </div>
        )}
        {(() => {
          const mCPU = toMap(cpu.data)
          const mMem = toMap(mem.data)
          const mDU  = toMap(diskUse.data)
          const mDR  = toMap(diskRead.data)
          const mDW  = toMap(diskWrite.data)
          const mRX  = toMap(netRx.data)
          const mTX  = toMap(netTx.data)
          const rows = unionInstances(mCPU, mMem, mDU, mDR, mDW, mRX, mTX)
          if (rows.length === 0) return null
          return (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-2 text-gray-900 dark:text-white">instance</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">CPU %</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">Mem %</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">Disk used %</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">Disk read B/s</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">Disk write B/s</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">Net RX B/s</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">Net TX B/s</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((inst) => (
                    <tr key={inst} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="p-2 text-gray-900 dark:text-white">{inst}</td>
                      <td className={`p-2 text-right font-medium ${getPercentColor(mCPU.get(inst))}`}>
                        {n(mCPU.get(inst))}%
                      </td>
                      <td className={`p-2 text-right font-medium ${getPercentColor(mMem.get(inst))}`}>
                        {n(mMem.get(inst))}%
                      </td>
                      <td className={`p-2 text-right font-medium ${getPercentColor(mDU.get(inst))}`}>
                        {n(mDU.get(inst))}%
                      </td>
                      <td className="p-2 text-right text-gray-900 dark:text-white">{n(mDR.get(inst),0)}</td>
                      <td className="p-2 text-right text-gray-900 dark:text-white">{n(mDW.get(inst),0)}</td>
                      <td className="p-2 text-right text-gray-900 dark:text-white">{n(mRX.get(inst),0)}</td>
                      <td className="p-2 text-right text-gray-900 dark:text-white">{n(mTX.get(inst),0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })()}
      </section>

      {/* Section: Additional Node Exporter Metrics */}
      <section className="mb-8">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">시스템 메트릭 (Node Exporter)</h2>
          
        </div>
        {(load1m.error||fdUsed.error||uptime.error) && (
          <div className="text-red-600 text-sm mb-4">
            {load1m.error?.message || fdUsed.error?.message || uptime.error?.message}
          </div>
        )}
        {(() => {
          const mLoad1 = toMap(load1m.data)
          const mLoad5 = toMap(load5m.data)
          const mLoad15 = toMap(load15m.data)
          const mFDUsed = toMap(fdUsed.data)
          const mFDMax = toMap(fdMax.data)
          const mProcess = toMap(processCount.data)
          const mUptime = toMap(uptime.data)
          const mSwap = toMap(swapUsed.data)
          const mTemp = toMap(temperature.data)
          const mTCP = toMap(tcpConnections.data)
          const rows = unionInstances(mLoad1, mLoad5, mLoad15, mFDUsed, mFDMax, mProcess, mUptime, mSwap, mTemp, mTCP)
          if (rows.length === 0) return null
          return (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-2 text-gray-900 dark:text-white">instance</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">Load 1m</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">Load 5m</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">Load 15m</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">FD 사용률</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">프로세스 수</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">업타임</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">Swap %</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">
                      온도
                    </th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">TCP 연결</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((inst) => {
                    const fdUsedVal = mFDUsed.get(inst)
                    const fdMaxVal = mFDMax.get(inst)
                    const fdPercent = fdUsedVal && fdMaxVal ? (fdUsedVal / fdMaxVal * 100) : undefined
                    return (
                      <tr key={inst} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="p-2 text-gray-900 dark:text-white">{inst}</td>
                        <td className={`p-2 text-right font-medium ${getLoadColor(mLoad1.get(inst))}`}>
                          {n(mLoad1.get(inst), 2)}
                        </td>
                        <td className={`p-2 text-right font-medium ${getLoadColor(mLoad5.get(inst))}`}>
                          {n(mLoad5.get(inst), 2)}
                        </td>
                        <td className={`p-2 text-right font-medium ${getLoadColor(mLoad15.get(inst))}`}>
                          {n(mLoad15.get(inst), 2)}
                        </td>
                        <td className={`p-2 text-right font-medium ${getPercentColor(fdPercent)}`}>
                          {fdPercent !== undefined ? fmtPercent(fdPercent) : '…'}
                        </td>
                        <td className="p-2 text-right text-gray-900 dark:text-white">{comma(mProcess.get(inst))}</td>
                        <td className="p-2 text-right text-gray-900 dark:text-white">{fmtUptime(mUptime.get(inst))}</td>
                        <td className={`p-2 text-right font-medium ${getPercentColor(mSwap.get(inst))}`}>
                          {fmtPercent(mSwap.get(inst))}
                        </td>
                        <td className={`p-2 text-right font-medium ${getTempColor(mTemp.get(inst))}`}>
                          {fmtTemp(mTemp.get(inst))}
                        </td>
                        <td className="p-2 text-right text-gray-900 dark:text-white">{comma(mTCP.get(inst))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })()}
      </section>

      {/* Section: Broker important metrics */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Kafka Broker • Important</h2>
        {(urp.error||offline.error||activeController.error) && (
          <div className="text-red-600 text-sm mb-4">
            {urp.error?.message || offline.error?.message || activeController.error?.message}
          </div>
        )}
        {(() => {
          const mURP = toMap(urp.data)
          const mOFF = toMap(offline.data)
          const mAC  = toMap(activeController.data)
          const rows = unionInstances(mURP, mOFF, mAC)
          if (rows.length === 0) return null
          return (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-2 text-gray-900 dark:text-white">instance</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">URP</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">Offline Partitions</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">Active Controller</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((inst) => {
                    const urp = mURP.get(inst) || 0
                    const offline = mOFF.get(inst) || 0
                    const controller = mAC.get(inst) || 0
                    return (
                      <tr key={inst} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="p-2 text-gray-900 dark:text-white">{inst}</td>
                        <td className={`p-2 text-right font-medium ${urp > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {n(urp, 0)}
                        </td>
                        <td className={`p-2 text-right font-medium ${offline > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {n(offline, 0)}
                        </td>
                        <td className={`p-2 text-right font-medium ${controller === 1 ? 'text-green-600 dark:text-green-400' : 'text-gray-500'}`}>
                          {n(controller, 0)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        })()}
      </section>

      {/* Section: Totals */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">총합</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="총 토픽 수" value={comma(topics.data?.[0]?.value?.[1])} />
          <Card title="총 파티션 수" value={comma(partitions.data?.[0]?.value?.[1])} />
        </div>
      </section>

      {/* Section: User-created topics */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">사용자 생성 토픽</h2>
        {userTopics.error && (
          <div className="text-red-600 text-sm mb-4">토픽 조회 오류: {userTopics.error.message}</div>
        )}
        <div className="flex flex-col lg:flex-row gap-4">
          <Card title="사용자 생성 토픽 수" value={String(userTopics.data ? userTopics.data.length : '…')} />
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800 flex-1">
            <div className="text-gray-500 dark:text-gray-400 text-sm mb-2">토픽 이름</div>
            <div className="max-h-56 overflow-auto">
              {(!userTopics.data || userTopics.data.length === 0) ? (
                <div className="text-gray-500 text-sm">표시할 사용자 토픽이 없습니다. (트래픽 발생 전에는 JMX가 per-topic 지표를 노출하지 않을 수 있어요)</div>
              ) : (
                <ul className="list-disc list-inside space-y-1">
                  {userTopics.data.map((t) => (
                    <li key={t} className="text-gray-900 dark:text-white">{t}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Section: Client traffic */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">브로커별 트래픽</h2>
        {(bytesIn.error||bytesOut.error) && (
          <div className="text-red-600 text-sm mb-4">
            {bytesIn.error?.message || bytesOut.error?.message}
          </div>
        )}
        {(() => {
          const mIN = toMap(bytesInByInst.data)
          const mOUT = toMap(bytesOutByInst.data)
          const rows = unionInstances(mIN, mOUT)
          if (rows.length === 0) {
            // fallback: 총합만이라도 보여주기
            const totalIn  = Number(bytesIn.data?.[0]?.value?.[1])
            const totalOut = Number(bytesOut.data?.[0]?.value?.[1])
            if (Number.isFinite(totalIn) || Number.isFinite(totalOut)) {
              return (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left p-2 text-gray-900 dark:text-white">브로커(instance)</th>
                        <th className="text-right p-2 text-gray-900 dark:text-white">초당 유입률 (Bytes In)</th>
                        <th className="text-right p-2 text-gray-900 dark:text-white">초당 유출률 (Bytes Out)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100 dark:border-gray-800">
                        <td className="p-2 text-gray-900 dark:text-white">total</td>
                        <td className="p-2 text-right text-gray-900 dark:text-white">{fmtBytes(totalIn)}</td>
                        <td className="p-2 text-right text-gray-900 dark:text-white">{fmtBytes(totalOut)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="text-gray-500 text-sm mt-2">참고: per-instance 라벨이 없어 총합으로 대체 표시 중입니다. (쿼리: sum by(instance, hostname)(...))</div>
                </div>
              )
            }
            return (
              <div className="text-gray-500 text-sm">
                수집된 트래픽 메트릭이 없습니다. (PromQL 예: sum by(instance, hostname)(kafka_server_brokertopicmetrics_bytesinpersec_fiveminuterate))
              </div>
            )
          }
          return (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-2 text-gray-900 dark:text-white">브로커(instance)</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">초당 유입률 (Bytes In)</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">초당 유출률 (Bytes Out)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((inst) => (
                    <tr key={inst} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="p-2 text-gray-900 dark:text-white">{inst}</td>
                      <td className="p-2 text-right text-gray-900 dark:text-white">{fmtBytes(mIN.get(inst))}</td>
                      <td className="p-2 text-right text-gray-900 dark:text-white">{fmtBytes(mOUT.get(inst))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })()}
      </section>

      {/* Section: Producer Metrics */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">프로듀서 메트릭</h2>
        {(producerMsgRate.error||producerErrorRate.error) && (
          <div className="text-red-600 text-sm mb-4">
            {producerMsgRate.error?.message || producerErrorRate.error?.message}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card 
            title="메시지 전송률" 
            value={`${comma(Number(producerMsgRate.data?.[0]?.value?.[1]) || 0)} msg/s`} 
          />
          <Card 
            title="바이트 전송률" 
            value={fmtBytes(producerByteRate.data?.[0]?.value?.[1])} 
          />
          <Card 
            title="에러율" 
            value={`${comma(Number(producerErrorRate.data?.[0]?.value?.[1]) || 0)} errors/s`} 
          />
          <Card 
            title="배치 크기" 
            value={`${n(producerBatchSize.data?.[0]?.value?.[1], 1)} msgs`} 
          />
          <Card 
            title="요청률" 
            value={`${comma(Number(producerRequestRate.data?.[0]?.value?.[1]) || 0)} req/s`} 
          />
        </div>
      </section>

      {/* Section: Consumer Metrics */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">컨슈머 메트릭</h2>
        {(consumerMsgRate.error||consumerLag.error) && (
          <div className="text-red-600 text-sm mb-4">
            {consumerMsgRate.error?.message || consumerLag.error?.message}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card 
            title="메시지 처리률" 
            value={`${comma(Number(consumerMsgRate.data?.[0]?.value?.[1]) || 0)} msg/s`} 
          />
          <Card 
            title="바이트 처리률" 
            value={fmtBytes(consumerByteRate.data?.[0]?.value?.[1])} 
          />
          <Card 
            title="컨슈머 지연" 
            value={`${comma(Number(consumerLag.data?.[0]?.value?.[1]) || 0)} msgs`} 
          />
          <Card 
            title="Fetch 요청률" 
            value={`${comma(Number(consumerFetchRate.data?.[0]?.value?.[1]) || 0)} req/s`} 
          />
          <Card 
            title="리밸런스율" 
            value={`${comma(Number(consumerRebalanceRate.data?.[0]?.value?.[1]) || 0)} rebalances/s`} 
          />
        </div>
      </section>

      {/* Section: Topic traffic */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">토픽별 트래픽 <span className="text-sm text-gray-500">(10초마다 갱신)</span></h2>
        {(() => {
          const mIn = toMapBy(topicBytesIn.data, 'topic')
          const mOut = toMapBy(topicBytesOut.data, 'topic')
          const topicsArr = Array.from(new Set<string>([...mIn.keys(), ...mOut.keys()]))
          if (topicsArr.length === 0) {
            return (
              <div className="text-gray-500 text-sm">
                표시할 토픽 트래픽이 없습니다. (PromQL 예: sum by(topic)(kafka_server_brokertopicmetrics_bytesinpersec_fiveminuterate))
              </div>
            )
          }
          // 상위 20개 (Bytes In 기준) 정렬
          const sorted = topicsArr.sort((a,b) => (mIn.get(b)||0) - (mIn.get(a)||0)).slice(0,20)
          return (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-2 text-gray-900 dark:text-white">토픽</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">초당 유입률 (Bytes In)</th>
                    <th className="text-right p-2 text-gray-900 dark:text-white">초당 유출률 (Bytes Out)</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((t) => (
                    <tr key={t} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="p-2 text-gray-900 dark:text-white">{t}</td>
                      <td className="p-2 text-right text-gray-900 dark:text-white">{fmtBytes(mIn.get(t))}</td>
                      <td className="p-2 text-right text-gray-900 dark:text-white">{fmtBytes(mOut.get(t))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })()}
        </section>
      </div>
    </div>
  )
}

function Card({ title, value }: { title: string, value: string }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-800">
      <div className="text-gray-500 dark:text-gray-400 text-sm">{title}</div>
      <div className="text-xl font-bold text-gray-900 dark:text-white">{value}</div>
    </div>
  )
}
