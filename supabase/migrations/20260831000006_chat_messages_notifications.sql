-- ==============================================================================
-- Migration 06: Real-time Conversations, Messages, and Notifications
-- ==============================================================================

-- 1. Conversation Channels between Client/Buyer and Advertiser/Broker
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    advertiser_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    last_message_text TEXT,
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    buyer_unread_count INT NOT NULL DEFAULT 0 CHECK (buyer_unread_count >= 0),
    advertiser_unread_count INT NOT NULL DEFAULT 0 CHECK (advertiser_unread_count >= 0),
    
    is_archived_buyer BOOLEAN NOT NULL DEFAULT FALSE,
    is_archived_advertiser BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_property_conversation UNIQUE (property_id, buyer_id, advertiser_id)
);

CREATE TRIGGER set_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Chat Messages
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    text TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb, -- e.g. [{"url": "...", "type": "image", "name": "..."}]
    read_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_message_content CHECK (char_length(text) > 0 OR jsonb_array_length(attachments) > 0)
);

-- Sync conversation state upon new message
CREATE OR REPLACE FUNCTION public.handle_new_message_sync()
RETURNS TRIGGER AS $$
DECLARE
    conv_rec RECORD;
BEGIN
    SELECT buyer_id, advertiser_id INTO conv_rec FROM public.conversations WHERE id = NEW.conversation_id;
    
    IF conv_rec IS NOT NULL THEN
        IF NEW.sender_id = conv_rec.buyer_id THEN
            UPDATE public.conversations
            SET last_message_text = LEFT(NEW.text, 200),
                last_message_at = NEW.created_at,
                advertiser_unread_count = advertiser_unread_count + 1
            WHERE id = NEW.conversation_id;
        ELSE
            UPDATE public.conversations
            SET last_message_text = LEFT(NEW.text, 200),
                last_message_at = NEW.created_at,
                buyer_unread_count = buyer_unread_count + 1
            WHERE id = NEW.conversation_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_new_message_sync
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_message_sync();

-- 3. In-App Real-time Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    type public.notification_type NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON public.conversations(buyer_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_advertiser ON public.conversations(advertiser_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, created_at DESC) WHERE read = FALSE;
