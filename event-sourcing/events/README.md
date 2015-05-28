---
currentMenu: events
---

# Events

Because we're diving into the subject of Event Sourcing, we need some events to source!

Let's imagine we're building a shopping basket.
Basically we need to be able to pick a basket up and put products in it.
In the real world we would probably want to do more with a basket, but for now this will suffice.


### Basket was picked up

Here is our first event:

```php
use SimpleES\EventSourcing\Event\DomainEvent;

final class BasketWasPickedUp implements DomainEvent
{
    /** @var BasketId */
    private $basketId;

    /** @param BasketId $basketId */
    public function __construct(BasketId $basketId)
    {
        $this->basketId = $basketId;
    }

    /** @return BasketId */
    public function basketId()
    {
        return $this->basketId;
    }
}
```

Notice the event implements `DomainEvent`, which is needed for the library to recognize it as an event.

The event contains a `BasketId`, which is effectively the identifier of our basket aggregate.
We'll cover the aggregate itself in the next chapter.

Identifiers are easily created:

```php
use SimpleES\EventSourcing\Identifier\Identifies;
use SimpleES\EventSourcing\Identifier\IdentifyingCapabilities;

final class BasketId implements Identifies
{
    use IdentifyingCapabilities;
}
```

The `Identifies` interface has 3 simple methods: `fromString($string)` (a static factory method), `equals($other)` and `toString()`.

The `IdentifyingCapabilities` trait has an implementation for these methods (plus the magic `__toString()`).

Other than that, there's nothing really fancy going on here.


### Product was added to basket

On to our second event:

```php
final class ProductWasAddedToBasket implements DomainEvent
{
    /** @var BasketId */
    private $basketId;

    /** @var ProductId */
    private $productId;

    /**
     * @param BasketId  $basketId
     * @param ProductId $productId
     */
    public function __construct(BasketId $basketId, ProductId $productId)
    {
        $this->basketId  = $basketId;
        $this->productId = $productId;
    }

    /** @return BasketId */
    public function basketId()
    {
        return $this->basketId;
    }

    /** @return ProductId */
    public function productId()
    {
        return $this->productId;
    }
}
```

This event also contains the identifier of our basket aggregate, as well has the identifier of the product that was added to it.

And of course we need to create that product identifier:

```php
use SimpleES\EventSourcing\Identifier\Identifies;
use SimpleES\EventSourcing\Identifier\IdentifyingCapabilities;

final class ProductId implements Identifies
{
    use IdentifyingCapabilities;
}
```

And there we have our 2 events.
Let's see how we can make them happen [next](/event-sourcing/aggregates).
