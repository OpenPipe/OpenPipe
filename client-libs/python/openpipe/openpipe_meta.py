from attr import dataclass


@dataclass
class OpenPipeMeta:
    # Cache status. One of 'HIT', 'MISS', 'SKIP'
    cache_status: str
