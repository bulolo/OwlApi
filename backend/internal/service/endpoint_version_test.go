package service

import (
	"context"
	"errors"
	"testing"

	"github.com/bulolo/owlapi/internal/domain"
)

// ── fakes ───────────────────────────────────────────────────────────────────
// Each fake embeds the domain interface so unimplemented methods panic if ever
// called — we only implement what the functions under test actually touch.

type fakeScripts struct {
	domain.ScriptRepository
	byID map[int64]*domain.Script
}

func (f *fakeScripts) GetByID(_ context.Context, _, id int64) (*domain.Script, error) {
	if s, ok := f.byID[id]; ok {
		return s, nil
	}
	return nil, domain.ErrNotFound("script not found")
}

type fakeVersions struct {
	domain.EndpointVersionRepository
	byID map[int64]*domain.EndpointVersion
}

func (f *fakeVersions) GetByID(_ context.Context, _, id int64) (*domain.EndpointVersion, error) {
	if v, ok := f.byID[id]; ok {
		return v, nil
	}
	return nil, domain.ErrNotFound("endpoint version not found")
}

type fakeActive struct {
	domain.EndpointActiveVersionRepository
	current      *domain.EndpointActiveVersion
	upsertedVID  int64
	upsertCalled bool
}

func (f *fakeActive) Get(_ context.Context, _, _, _ int64) (*domain.EndpointActiveVersion, error) {
	if f.current == nil {
		return nil, domain.ErrNotFound("active version not found")
	}
	return f.current, nil
}

func (f *fakeActive) Upsert(_ context.Context, _, _, _, versionID, _ int64) error {
	f.upsertCalled = true
	f.upsertedVID = versionID
	return nil
}

type fakeLog struct {
	domain.EndpointActivationLogRepository
	lastAction domain.ActivationAction
}

func (f *fakeLog) Append(_ context.Context, _, _, _, _ int64, _ int, _ int64, action domain.ActivationAction) error {
	f.lastAction = action
	return nil
}

// ── snapshotChain ───────────────────────────────────────────────────────────

func TestSnapshotChain(t *testing.T) {
	svc := &endpointVersionService{scripts: &fakeScripts{byID: map[int64]*domain.Script{
		7: {ID: 7, Name: "分页参数处理", Type: "pre", Code: "lib-code"},
	}}}

	steps := []domain.ScriptStep{
		{Source: domain.ScriptStepInline, Name: "参数校验", Code: "inline-code"},
		{Source: domain.ScriptStepLibrary, ScriptID: 7},
		{Source: domain.ScriptStepLibrary, ScriptID: 999}, // missing → skipped, not fatal
	}

	snaps := svc.snapshotChain(context.Background(), 1, steps)

	if len(snaps) != 2 {
		t.Fatalf("want 2 snapshots (inline + resolved lib, missing skipped), got %d", len(snaps))
	}
	if snaps[0].Name != "参数校验" || snaps[0].Code != "inline-code" {
		t.Errorf("inline step not snapshotted verbatim: %+v", snaps[0])
	}
	if snaps[1].ID != 7 || snaps[1].Code != "lib-code" || snaps[1].Name != "分页参数处理" {
		t.Errorf("library step not resolved from repo: %+v", snaps[1])
	}
}

// ── Activate: rollback vs activate decision ─────────────────────────────────

func TestActivate_ActionDecision(t *testing.T) {
	const endpointID = int64(100)

	newSvc := func(currentVersion int) (*endpointVersionService, *fakeActive, *fakeLog) {
		active := &fakeActive{}
		if currentVersion > 0 {
			active.current = &domain.EndpointActiveVersion{Version: currentVersion}
		}
		log := &fakeLog{}
		svc := &endpointVersionService{
			versions: &fakeVersions{byID: map[int64]*domain.EndpointVersion{
				30: {ID: 30, EndpointID: endpointID, Version: 3},
			}},
			active: active,
			log:    log,
		}
		return svc, active, log
	}

	t.Run("rollback when current > target", func(t *testing.T) {
		svc, active, log := newSvc(5) // live v5, activating v3
		if err := svc.Activate(context.Background(), 1, endpointID, 200, 30, 99); err != nil {
			t.Fatalf("Activate: %v", err)
		}
		if log.lastAction != domain.ActivationActionRollback {
			t.Errorf("want rollback, got %q", log.lastAction)
		}
		if !active.upsertCalled || active.upsertedVID != 30 {
			t.Errorf("expected upsert to version 30, got called=%v vid=%d", active.upsertCalled, active.upsertedVID)
		}
	})

	t.Run("activate when no current / forward", func(t *testing.T) {
		svc, _, log := newSvc(2) // live v2, activating v3
		if err := svc.Activate(context.Background(), 1, endpointID, 200, 30, 99); err != nil {
			t.Fatalf("Activate: %v", err)
		}
		if log.lastAction != domain.ActivationActionActivate {
			t.Errorf("want activate, got %q", log.lastAction)
		}
	})

	t.Run("rejects version belonging to another endpoint", func(t *testing.T) {
		svc, _, _ := newSvc(0)
		err := svc.Activate(context.Background(), 1, 999 /* wrong endpoint */, 200, 30, 99)
		if err == nil {
			t.Fatal("expected error when version does not belong to endpoint")
		}
	})
}

// ── Promote: same-env guard ─────────────────────────────────────────────────

func TestPromote_RejectsSameEnv(t *testing.T) {
	svc := &endpointVersionService{} // returns before touching any repo
	err := svc.Promote(context.Background(), 1, 100, 5, 5, 99)
	if err == nil {
		t.Fatal("expected error promoting to the same env")
	}
	var de *domain.Error
	if !errors.As(err, &de) || de.Code != 400 {
		t.Errorf("want 400 bad-request, got %v", err)
	}
}
