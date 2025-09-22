// src/lib/kafkaAdmin.ts
// 이 파일은 이제 kafkaControlCenter.ts로 대체되었습니다.
// 하위 호환성을 위해 일부 함수들을 re-export합니다.

export {
  listTopics,
  createTopic,
  deleteTopic,
  type CreateTopicReq
} from './kafkaControlCenter';