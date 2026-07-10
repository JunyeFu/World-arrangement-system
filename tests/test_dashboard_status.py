from orchestrator.dashboard_status import compute_top_status_counts, derive_dashboard_status
from orchestrator.state_machine import STATE_ALIASES, TRANSITIONS


def test_new_maps_to_queued():
    status = derive_dashboard_status({"status": "NEW"})

    assert status.display_status == "NEW"
    assert status.big_status == "Queued"
    assert status.console_group == "queued"


def test_executing_with_fresh_heartbeat_maps_to_running():
    status = derive_dashboard_status({"status": "EXECUTING"}, heartbeat_fresh=True)

    assert status.display_status == "EXECUTING"
    assert status.big_status == "Running"
    assert status.is_live is True


def test_executing_with_stale_heartbeat_maps_to_alerts():
    status = derive_dashboard_status({"status": "EXECUTING"}, heartbeat_fresh=False)

    assert status.display_status == "STALE_EXECUTING"
    assert status.big_status == "Alerts"
    assert status.is_stale is True


def test_reviewing_with_stale_heartbeat_maps_to_alerts():
    status = derive_dashboard_status({"status": "REVIEWING"}, heartbeat_fresh=False)

    assert status.display_status == "STALE_REVIEWING"
    assert status.big_status == "Alerts"


def test_blocked_maps_to_approval():
    status = derive_dashboard_status({"status": "BLOCKED"})

    assert status.big_status == "Approval"
    assert status.requires_user_action is True


def test_failed_final_maps_to_failed():
    status = derive_dashboard_status({"status": "FAILED_FINAL"})

    assert status.big_status == "Failed"
    assert status.is_terminal is True


def test_done_is_hidden():
    status = derive_dashboard_status({"status": "COMPLETED_WITH_ARTIFACTS"})

    assert status.big_status == "Done"
    assert status.console_group == "none"


def test_partial_artifacts_done_is_hidden():
    status = derive_dashboard_status({"status": "COMPLETED_WITH_PARTIAL_ARTIFACTS"})

    assert status.big_status == "Done"
    assert status.console_group == "none"
    assert status.is_terminal is True


def test_cancelled_is_closed_hidden():
    status = derive_dashboard_status({"status": "CANCELLED"})

    assert status.big_status == "Closed"
    assert status.console_group == "none"


def test_done_with_block_maps_to_approval():
    status = derive_dashboard_status({"status": "DONE_WITH_BLOCK"})

    assert status.big_status == "Approval"
    assert status.console_group == "approval"
    assert status.requires_user_action is True


def test_future_waiting_and_needs_statuses_map_to_approval():
    waiting = derive_dashboard_status({"status": "MANUAL_APPROVAL_WAITING"})
    needs = derive_dashboard_status({"status": "NEEDS_OPERATOR"})

    assert waiting.big_status == "Approval"
    assert needs.big_status == "Approval"


def test_all_declared_lifecycle_and_legacy_states_have_a_big_status():
    declared = set(TRANSITIONS) | set(STATE_ALIASES) | {
        target for targets in TRANSITIONS.values() for target in targets
    }
    declared.add("PUBLISHING")

    statuses = [derive_dashboard_status({"status": status}) for status in declared]

    assert all(status.big_status for status in statuses)
    assert all(status.display_status != "UNKNOWN_STATUS" for status in statuses)


def test_retrying_without_scheduler_maps_to_retry_stuck_alert():
    status = derive_dashboard_status({"status": "RETRYING"})

    assert status.display_status == "RETRY_STUCK"
    assert status.big_status == "Alerts"


def test_retry_scheduled_maps_to_queued():
    status = derive_dashboard_status(
        {"status": "RETRYING", "next_attempt_at": "2099-01-01T00:00:00Z"},
        retry_scheduler_reliable=True,
        now_ts=0,
    )

    assert status.display_status == "RETRY_SCHEDULED"
    assert status.big_status == "Queued"


def test_retrying_with_fresh_heartbeat_maps_to_running():
    status = derive_dashboard_status(
        {"status": "RETRYING", "next_attempt_at": "2000-01-01T00:00:00Z"},
        heartbeat_fresh=True,
        retry_scheduler_reliable=True,
        now_ts=946684801,
    )

    assert status.display_status == "RETRYING"
    assert status.big_status == "Running"


def test_control_failed_overrides_executing_to_worker_failed():
    status = derive_dashboard_status({"status": "EXECUTING"}, control_process={"status": "failed"})

    assert status.display_status == "WORKER_FAILED"
    assert status.big_status == "Failed"


def test_control_timed_out_overrides_executing_to_worker_timed_out():
    status = derive_dashboard_status({"status": "EXECUTING"}, control_process={"status": "timed_out"})

    assert status.display_status == "WORKER_TIMED_OUT"
    assert status.big_status == "Failed"


def test_terminal_completion_ignores_stale_failed_control_process():
    status = derive_dashboard_status(
        {"status": "COMPLETED_WITH_PARTIAL_ARTIFACTS"},
        control_process={"status": "failed"},
    )

    assert status.display_status == "COMPLETED_WITH_PARTIAL_ARTIFACTS"
    assert status.big_status == "Done"
    assert status.console_group == "none"


def test_missing_artifacts_maps_to_alerts():
    status = derive_dashboard_status({"status": "DONE"}, has_missing_artifacts=True)

    assert status.display_status == "MISSING_ARTIFACTS"
    assert status.big_status == "Alerts"


def test_unknown_status_maps_to_alerts():
    status = derive_dashboard_status({"status": "SOMETHING_NEW"})

    assert status.display_status == "UNKNOWN_STATUS"
    assert status.big_status == "Alerts"


def test_compute_top_status_counts_includes_done_and_hides_closed():
    tasks = [
        derive_dashboard_status({"status": "EXECUTING"}, heartbeat_fresh=True).to_dict(),
        derive_dashboard_status({"status": "NEW"}).to_dict(),
        derive_dashboard_status({"status": "FAILED_FINAL"}).to_dict(),
        derive_dashboard_status({"status": "NEEDS_USER"}).to_dict(),
        derive_dashboard_status({"status": "RETRYING"}).to_dict(),
        derive_dashboard_status({"status": "DONE"}).to_dict(),
        derive_dashboard_status({"status": "CANCELLED"}).to_dict(),
    ]

    assert compute_top_status_counts(tasks) == {
        "running": 1,
        "queued": 1,
        "failed": 1,
        "approval_waiting": 1,
        "alerts": 1,
        "done": 1,
    }
